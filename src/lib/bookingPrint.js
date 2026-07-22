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

    if (booking.serviceType === 'vehicle' && booking.driverName) {
      detailLines.push(
        `<div style="font-size: 10.5px; color: #1e3a8a; font-weight: bold; margin-top: 4px; border-top: 1px dotted #cbd5e1; padding-top: 3px;">
          👨‍✈️ Driver: ${escapeHtml(booking.driverName)} (📞 ${escapeHtml(booking.driverPhone || 'N/A')})<br/>
          📏 Total KM: ${escapeHtml(booking.totalKm || 'N/A')}
        </div>`
      );
    }

    // Map approvals list trail to status labels
    const approvalSteps = (booking.approvals || []).map(ap => {
      const stageName = ap.stage || 'Approver';
      const isApproved = ap.status === 'approved';
      const actionLabel = isApproved ? '' : ' [REJECTED]';
      const approverName = ap.approvedBy?.name || 'Authorized Signatory';
      const timeStr = ap.approvedAt ? new Date(ap.approvedAt).toLocaleDateString() : '';

      if (stageName === 'HOD') {
        const deptSuffix = ap.approvedBy?.department ? ` (${ap.approvedBy.department})` : '';
        return `<div style="font-size: 10px; color: #475569; margin-top: 3px; border-top: 1px dashed #e2e8f0; padding-top: 2px;">
          HOD${actionLabel}: ${escapeHtml(approverName)}${escapeHtml(deptSuffix)}
        </div>`;
      }

      return `<div style="font-size: 10px; color: #475569; margin-top: 3px; border-top: 1px dashed #e2e8f0; padding-top: 2px;">
        ${escapeHtml(stageName)}${actionLabel}: ${escapeHtml(approverName)} ${timeStr ? `(${timeStr})` : ''}
      </div>`;
    }).join('');

    const actionInfo = booking.actionBy?.name && status !== 'pending' && (!booking.approvals || booking.approvals.length === 0)
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
          ${statusInfo ? `<small style="color: #666; font-size: 11px;">${statusInfo}</small>` : ''}
          ${approvalSteps}
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

export const printSingleBooking = (booking) => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return false;

  const escape = (val) => String(val ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  
  let contentHtml = '';
  const approvalsList = (booking.approvals || []).map(ap => `
    <div style="font-size: 11px; margin-bottom: 4px; color: #334155;">
      ⏳ Stage <strong>${escape(ap.stage)}</strong>: ${ap.status === 'approved' ? '✅ Approved' : '❌ Rejected'} ${ap.approvedBy?.name ? `by ${escape(ap.approvedBy.name)}` : ''}
      ${ap.comment ? `<div style="font-style: italic; font-size: 10px; margin-left: 15px; color: #475569;">"${escape(ap.comment)}"</div>` : ''}
    </div>
  `).join('');

  if (booking.serviceType === 'vehicle') {
    contentHtml = `
      <div style="font-family: 'Courier New', Courier, monospace, sans-serif; color: #111; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="border-bottom: 2px double #000; padding-bottom: 12px; margin-bottom: 16px; text-align: center;">
          <img src="/images/image.png" alt="Logo" style="width: 100%; height: auto; display: block; margin: 0 auto;" />
        </div>
        
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
          <tbody>
            <tr style="border-bottom: 1px dashed #aaa;"><td style="padding: 8px 0; font-weight: bold; width: 200px;">DEPT:</td><td>${escape(booking.department || booking.user?.department || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px dashed #aaa;"><td style="padding: 8px 0; font-weight: bold;">FACULTY NAME:</td><td>${escape(booking.guestName || booking.user?.name || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px dashed #aaa;"><td style="padding: 8px 0; font-weight: bold;">CHIEF GUEST/PROGRAMME:</td><td>${escape(booking.purpose || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px dashed #aaa;"><td style="padding: 8px 0; font-weight: bold;">VEHICLE TYPE:</td><td>🚗 ${escape(booking.serviceId?.name || 'CAR / BUS / JEEP')}</td></tr>
            <tr style="border-bottom: 1px dashed #aaa;"><td style="padding: 8px 0; font-weight: bold;">ONWARD JOURNEY:</td><td>📅 ${escape(booking.vehiclePickupDate)} at ${formatTime12h(booking.vehiclePickupTime || '09:00')}</td></tr>
            <tr style="border-bottom: 1px dashed #aaa;"><td style="padding: 8px 0; font-weight: bold;">RETURN JOURNEY:</td><td>📅 ${escape(booking.vehicleReturnDate)} at ${formatTime12h(booking.vehicleReturnTime || '17:00')}</td></tr>
            ${booking.driverName ? `
              <tr style="border-bottom: 1px dashed #aaa; color: #1e3a8a; font-weight: bold;"><td style="padding: 8px 0;">DRIVER NAME:</td><td>👨‍✈️ ${escape(booking.driverName)}</td></tr>
              <tr style="border-bottom: 1px dashed #aaa; color: #1e3a8a; font-weight: bold;"><td style="padding: 8px 0;">DRIVER PHONE:</td><td>📞 ${escape(booking.driverPhone)}</td></tr>
              <tr style="border-bottom: 1px dashed #aaa; color: #1e3a8a; font-weight: bold;"><td style="padding: 8px 0;">TOTAL KM:</td><td>📏 ${escape(booking.totalKm || 'N/A')}</td></tr>
            ` : ''}
          </tbody>
        </table>

        <div style="margin-top: 25px; border-top: 1px solid #000; padding-top: 12px;">
          <h5 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #555; font-weight: bold;">Workflow Approvals Checklist:</h5>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; font-size: 11px; text-align: center;">
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>HOD</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'HOD') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>ADMIN</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'Admin') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>PRINCIPAL</div>
              <strong style={{ color: '#10b981' }}>${booking.approvals?.some(a => a.stage === 'Principal') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>AO</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'Administrative Officer (AO)') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>TRANS. MGR</div>
              <strong style="color: #10b981;">${booking.status === 'approved' ? '✓ ALLOCATED' : '⏳ PENDING'}</strong>
            </div>
          </div>
        </div>
        ${approvalsList ? `
          <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">Approval Trail Details:</div>
            ${approvalsList}
          </div>
        ` : ''}
      </div>
    `;
  } else if (booking.serviceType === 'room') {
    contentHtml = `
      <div style="font-family: Georgia, serif; color: #111; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; text-align: center;">
          <img src="/images/image.png" alt="Logo" style="width: 100%; height: auto; display: block; margin: 0 auto;" />
        </div>

        <div style="font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
          <p style="margin: 4px 0;"><strong>FROM:</strong> ${escape(booking.user?.name || booking.guestName)}</p>
          <p style="margin: 4px 0;"><strong>TO:</strong> The Principal, KIOT</p>
          <p style="margin: 8px 0; border-left: 3px solid #555; padding-left: 8px; font-style: italic;">
            <strong>Sub:</strong> Requisition for Guest Accommodation & Food Reg.
          </p>
          <p style="margin: 4px 0; text-indent: 20px;">
            We request you to provide food & accommodation in <strong>A-Block / Gents Hostel</strong> as mentioned below:
          </p>
        </div>

        <table style="width: 100%; font-size: 12px; border: 1px solid #ccc; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1px solid #ccc;">
              <th style="padding: 8px; border-right: 1px solid #ccc;">Date range</th>
              <th style="padding: 8px; border-right: 1px solid #ccc;">Trainers count</th>
              <th style="padding: 8px; border-right: 1px solid #ccc;">Room type / Location</th>
              <th style="padding: 8px;">Requirements</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc;">${escape(booking.roomCheckInDate)} to ${escape(booking.roomCheckOutDate)}</td>
              <td style="padding: 8px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc;">${escape(booking.numberOfGuests || '1')} Male</td>
              <td style="padding: 8px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc;">
                🏢 ${escape(booking.serviceId?.name || 'Gents Hostel AC Room')}
                ${booking.serviceId?.roomNumber ? `<div>Room ${escape(booking.serviceId.roomNumber)} (Floor ${escape(booking.serviceId.floor || '0')})</div>` : ''}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #ccc;">Accommodation & Food</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 25px; border-top: 1px solid #000; padding-top: 12px;">
          <h5 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #555; font-weight: bold;">Workflow Approvals Checklist:</h5>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; font-size: 11px; text-align: center;">
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>HOD</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'HOD') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>ADMIN</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'Admin') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>PRINCIPAL</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'Principal') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>AO</div>
              <strong style="color: #10b981;">${booking.approvals?.some(a => a.stage === 'Administrative Officer (AO)') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
            <div style="padding: 8px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 6px;">
              <div>WARDEN</div>
              <strong style="color: #10b981;">${booking.status === 'approved' ? '✓ SIGNED' : '⏳ PENDING'}</strong>
            </div>
          </div>
        </div>
        ${approvalsList ? `
          <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">Approval Trail Details:</div>
            ${approvalsList}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    contentHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 12px; text-align: center;">
          <img src="/images/image.png" alt="Logo" style="width: 100%; height: auto; display: block; margin: 0 auto;" />
        </div>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold; width: 150px;">Seminar Hall:</td><td>${escape(booking.serviceId?.name || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Faculty Name:</td><td>${escape(booking.user?.name || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Department:</td><td>${escape(booking.department || booking.user?.department || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Event Date:</td><td>${escape(booking.hallDate || booking.date || 'N/A')}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Event Time:</td><td>${formatTime12h(booking.hallStartTime)} – ${formatTime12h(booking.hallEndTime)}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Purpose:</td><td>${escape(booking.purpose || 'N/A')}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Expected Attendees:</td><td>${escape(booking.attendees || 'N/A')}</td></tr>
          </tbody>
        </table>
        ${approvalsList ? `
          <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">Approval Trail Details:</div>
            ${approvalsList}
          </div>
        ` : ''}
      </div>
    `;
  }

  const printHtml = `
    <html>
      <head>
        <title>Print Requisition Form</title>
        <style>
          body { padding: 20px; margin: 0; }
          @media print {
            body { padding: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(printHtml);
  printWindow.document.close();
  return true;
};
