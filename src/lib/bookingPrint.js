const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

const formatDateTime = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
};

const normalizeServiceId = (serviceId) => {
  if (!serviceId) return null;
  if (serviceId === '[object Object]') return null;
  if (typeof serviceId === 'object') {
    return String(serviceId._id || serviceId.id || '');
  }
  return String(serviceId);
};

const getServiceDetails = async (booking) => {
  const serviceId = normalizeServiceId(booking.serviceId);
  if (!serviceId) return {};

  try {
    if (booking.serviceType === 'hall') {
      if (typeof booking.serviceId === 'object' && booking.serviceId._id) return { hall: booking.serviceId };
      const res = await fetch(`/api/halls?id=${serviceId}`);
      if (res.ok) return { hall: await res.json() };
    }

    if (booking.serviceType === 'vehicle') {
      if (typeof booking.serviceId === 'object' && booking.serviceId._id) return { vehicle: booking.serviceId };
      const res = await fetch(`/api/vehicles?id=${serviceId}`);
      if (res.ok) return { vehicle: await res.json() };
    }

    if (booking.serviceType === 'room') {
      if (typeof booking.serviceId === 'object' && booking.serviceId._id) return { room: booking.serviceId };
      const res = await fetch(`/api/rooms?id=${serviceId}`);
      if (res.ok) return { room: await res.json() };
    }
  } catch {
    console.error('Failed to load service details for print report');
  }

  return {};
};

const getBookingDetails = (booking, serviceDetails = {}) => {
  const hall = booking.serviceId || serviceDetails.hall;
  const vehicle = booking.serviceId || serviceDetails.vehicle;
  const room = booking.serviceId || serviceDetails.room;

  switch (booking.serviceType) {
    case 'hall':
      return {
        dateHtml: `<div><strong>Date:</strong> ${escapeHtml(booking.hallDate)}</div><div><strong>From:</strong> ${escapeHtml(formatTime12h(booking.hallStartTime))}</div><div><strong>To:</strong> ${escapeHtml(formatTime12h(booking.hallEndTime))}</div>`,
        time: '',
        location: `🏛️ ${escapeHtml(hall?.name || 'Hall')}`,
        description: `<div>${escapeHtml(booking.attendees || 0)} attendees</div>${booking.purpose ? `<div><strong>Purpose:</strong> ${escapeHtml(booking.purpose)}</div>` : ''}`,
      };
    case 'vehicle': {
      const driverText = booking.withDriver ? 'With Driver' : 'Self-drive';
      const routeInfo = booking.pickupLocation && booking.returnLocation
        ? ` (${escapeHtml(booking.pickupLocation)} → ${escapeHtml(booking.returnLocation)})`
        : '';

      return {
        dateHtml: `<div><strong>Pickup:</strong> ${escapeHtml(booking.vehiclePickupDate)} ${escapeHtml(formatTime12h(booking.vehiclePickupTime || '09:00'))}</div><div><strong>Return:</strong> ${escapeHtml(booking.vehicleReturnDate)} ${escapeHtml(formatTime12h(booking.vehicleReturnTime || '09:00'))}</div>`,
        time: '',
        location: `🚗 ${escapeHtml(vehicle?.name || 'Vehicle')} (${escapeHtml(vehicle?.registrationNumber || 'N/A')})`,
        description: `<div>${escapeHtml(driverText)}${routeInfo}${vehicle?.driverMobile ? ` | 📞 Driver: ${escapeHtml(vehicle.driverMobile)}` : ''}</div>${booking.purpose ? `<div><strong>Purpose:</strong> ${escapeHtml(booking.purpose)}</div>` : ''}`,
      };
    }
    case 'room': {
      const roomPurpose = booking.roomPurpose || booking.specialRequests;
      return {
        dateHtml: `<div><strong>Check-in:</strong> ${escapeHtml(booking.roomCheckInDate)} ${escapeHtml(formatTime12h(booking.roomCheckInTime || '14:00'))}</div><div><strong>Check-out:</strong> ${escapeHtml(booking.roomCheckOutDate)} ${escapeHtml(formatTime12h(booking.roomCheckOutTime || '12:00'))}</div>`,
        time: '',
        location: `🏨 Room #${escapeHtml(room?.roomNumber || 'N/A')}${room?.floor !== undefined && room?.floor !== null ? ` (Floor ${escapeHtml(String(room.floor))})` : ''}`,
        description: `<div>${escapeHtml(booking.numberOfGuests ? `${booking.numberOfGuests} guests` : 'N/A guests')}${booking.numberOfRooms ? ` • ${escapeHtml(String(booking.numberOfRooms))} room${booking.numberOfRooms > 1 ? 's' : ''}` : ''}</div>${roomPurpose ? `<div><strong>Purpose:</strong> ${escapeHtml(roomPurpose)}</div>` : ''}`,
      };
    }
    default:
      return { date: 'N/A', time: 'N/A', location: 'N/A', description: 'N/A' };
  }
};

export const buildBookingPrintHtml = (bookings, options = {}) => {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const generatedAt = new Date().toLocaleString();

  const rows = safeBookings.map((booking, index) => {
    const serviceDetails = booking._serviceDetails || {};
    const details = getBookingDetails(booking, serviceDetails);
    const status = booking.status || 'pending';
    const statusLabel = status.toUpperCase();

    const detailLines = [
      `<div>${details.location}</div>`,
      `<div>${details.description}</div>`,
      `<div><strong>Booked by:</strong> ${escapeHtml(booking.guestName || booking.user?.name || 'Unknown')}${(booking.user?.department || booking.department) ? ` (${escapeHtml(booking.user?.department || booking.department)})` : ''}</div>`,
    ];

    const actionInfo = booking.actionBy?.name && status !== 'pending'
      ? `${status === 'approved' ? '<strong>Approved by:</strong>' : status === 'rejected' ? '<strong>Rejected by:</strong>' : '<strong>Cancelled by:</strong>'} ${escapeHtml(booking.actionBy.name)}${booking.actionAt ? ' — ' + formatDateTime(booking.actionAt) : ''}`
      : '';
    const cancelledInfo = !booking.actionBy?.name && status === 'cancelled' && booking.cancelledAt
      ? `Cancelled at: ${formatDateTime(booking.cancelledAt)}`
      : '';

    const statusInfo = [actionInfo, cancelledInfo].filter(Boolean).join('<br/>');

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(booking.serviceType === 'hall' ? 'Hall Booking' : booking.serviceType === 'vehicle' ? 'Vehicle Booking' : 'Room Booking')}</td>
        <td class="date-cell">${details.dateHtml || escapeHtml(details.date)}</td>
        <td class="details-cell">${detailLines.filter(Boolean).join('')}</td>
        <td>
          <span class="status ${escapeHtml(status)}">${escapeHtml(statusLabel)}</span>
          ${statusInfo ? `<br/><small style="color: #666; font-size: 11px;">${statusInfo}</small>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <html>
    <head>
      <title>Booking Report</title>
      <style>
        @page { size: auto; margin: 8mm; }
        body { font-family: Arial, sans-serif; margin: 16px; line-height: 1.3; color: #1f2937; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; page-break-inside: auto; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        td.details-cell { text-align: left; vertical-align: top; }
        td.details-cell div { margin-bottom: 3px; }
        th { background-color: #1e3a8a; color: white; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        td, th { page-break-inside: avoid; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; display: block; margin-bottom: 8px; }
        .pending { background: rgba(243,156,18,0.2); color: #F39C12; }
        .approved { background: rgba(46,204,113,0.2); color: #2ECC71; }
        .rejected { background: rgba(231,76,60,0.2); color: #E74C3C; }
        .cancelled { background: rgba(149,152,154,0.2); color: #6C757D; }
        .report-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
        .report-title { font-size: 20px; font-weight: bold; color: #1e3a8a; }
        .report-subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
        .report-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
        img.logo { height: 60px; width: auto; }
      </style>
    </head>
    <body>
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="/images/image.png" alt="Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #334155; font-family: Arial, sans-serif;">${escapeHtml(options.title || 'Booking Report')}</div>
          ${options.subtitle ? `<div style="font-size: 12px; color: #64748b; font-family: Arial, sans-serif; margin-top: 4px;">${escapeHtml(options.subtitle)}</div>` : ''}
          <div style="font-size: 12px; color: #334155; font-family: Arial, sans-serif; margin-top: 4px; font-weight: 600;">Total Bookings: ${safeBookings.length}</div>
          <div style="font-size: 11px; color: #64748b; font-family: Arial, sans-serif; margin-top: 4px;">Generated: ${escapeHtml(generatedAt)}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Type</th>
            <th>Date</th>
            <th>Details</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

export const openBookingPrintWindow = async (bookings, options = {}) => {
  const enrichedBookings = await Promise.all((Array.isArray(bookings) ? bookings : []).map(async (booking) => {
    const serviceDetails = await getServiceDetails(booking);
    return { ...booking, _serviceDetails: serviceDetails };
  }));

  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return false;

  printWindow.document.write(buildBookingPrintHtml(enrichedBookings, options));
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);

  return true;
};
