export function checkConflict(newBooking, existingBookings) {
    const getTimes = (booking) => {
        if (booking.serviceType === 'hall' && booking.hallDate) {
            return {
                start: new Date(`${booking.hallDate}T${booking.hallStartTime}:00`),
                end: new Date(`${booking.hallDate}T${booking.hallEndTime}:00`)
            };
        } else if (booking.serviceType === 'vehicle' && booking.vehiclePickupDate) {
            return {
                start: new Date(`${booking.vehiclePickupDate}T${booking.vehiclePickupTime || '00:00'}:00`),
                end: new Date(`${booking.vehicleReturnDate}T${booking.vehicleReturnTime || '23:59'}:00`)
            };
        } else if (booking.serviceType === 'room' && booking.roomCheckInDate) {
            return {
                start: new Date(`${booking.roomCheckInDate}T${booking.roomCheckInTime || '14:00'}:00`),
                end: new Date(`${booking.roomCheckOutDate}T${booking.roomCheckOutTime || '12:00'}:00`)
            };
        }
        return null;
    };

    const newTimes = getTimes(newBooking);
    if (!newTimes) return false;

    return existingBookings.some(booking => {
        const existingTimes = getTimes(booking);
        if (!existingTimes) return false;
        return (newTimes.start < existingTimes.end && newTimes.end > existingTimes.start);
    });
}