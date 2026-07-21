/**
 * Brevo Email Service helper client.
 * Connects directly to Brevo's Transactional Email REST API.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends a transactional email using Brevo.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email.
 * @param {string} params.toName - Recipient name.
 * @param {string} params.subject - Email subject line.
 * @param {string} params.htmlContent - Full HTML email content.
 * @returns {Promise<Object>} API response body.
 */
export async function sendEmail({ toEmail, toName, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'noreply@kiot.ac.in';
  const senderName = process.env.SENDER_NAME || 'KIOT Facility Reservation';

  if (!apiKey) {
    console.warn('[BREVO EMAIL SERVICE] Warning: BREVO_API_KEY is not defined. Email will not be sent.');
    return { success: false, message: 'BREVO_API_KEY is missing' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: toName,
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[BREVO EMAIL SERVICE] Error sending email via Brevo:', data);
      return { success: false, error: data };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[BREVO EMAIL SERVICE] Network or Server error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send stage approval request email to HOD / Principal / AO / Transport Manager / Hostel Warden.
 */
export async function sendApprovalRequestEmail({ toEmail, toName, bookingType, bookingId, applicantName, applicantDept, stageName, detailsLink }) {
  const subject = `Action Required: New ${bookingType.toUpperCase()} Booking Pending your Approval - Stage: ${stageName}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">KIOT Facility Reservation</h2>
      <p>Dear <strong>${toName}</strong> (${stageName}),</p>
      <p>A new <strong>${bookingType}</strong> booking request has been submitted by <strong>${applicantName}</strong> from the <strong>${applicantDept}</strong> department and is now pending your approval.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #374151;">Booking Details Summary</h4>
        <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
        <p style="margin: 5px 0;"><strong>Booking Type:</strong> ${bookingType}</p>
        <p style="margin: 5px 0;"><strong>Applicant:</strong> ${applicantName} (${applicantDept})</p>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${detailsLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View and Respond to Request</a>
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
    </div>
  `;

  return sendEmail({ toEmail, toName, subject, htmlContent });
}

/**
 * Send booking status change update to the Faculty applicant.
 */
export async function sendBookingStatusUpdateEmail({ toEmail, toName, bookingType, bookingId, status, notes, driverDetails }) {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  let subject = `Booking Update: Your ${bookingType.toUpperCase()} Booking is ${status.toUpperCase()}`;
  
  let driverSection = '';
  if (driverDetails && isApproved) {
    driverSection = `
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">👨‍✈️ Assigned Driver Details</h4>
        <p style="margin: 5px 0;"><strong>Driver Name:</strong> ${driverDetails.driverName}</p>
        <p style="margin: 5px 0;"><strong>Driver Contact:</strong> ${driverDetails.driverPhone}</p>
        ${driverDetails.totalKm ? `<p style="margin: 5px 0;"><strong>Total Kilometers:</strong> ${driverDetails.totalKm}</p>` : ''}
        ${driverDetails.transportManagerNote ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${driverDetails.transportManagerNote}</p>` : ''}
      </div>
    `;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #1e3a8a; border-bottom: 2px solid ${isApproved ? '#10b981' : isRejected ? '#ef4444' : '#3b82f6'}; padding-bottom: 10px;">KIOT Facility Reservation</h2>
      <p>Dear <strong>${toName}</strong>,</p>
      <p>Your <strong>${bookingType}</strong> booking (ID: ${bookingId}) has been updated.</p>
      
      <p style="font-size: 16px;">Current Status: <strong style="color: ${isApproved ? '#10b981' : isRejected ? '#ef4444' : '#3b82f6'}; text-transform: uppercase;">${status}</strong></p>
      
      ${driverSection}
      
      ${notes ? `<p><strong>Remarks/Comments:</strong> ${notes}</p>` : ''}

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
    </div>
  `;

  return sendEmail({ toEmail, toName, subject, htmlContent });
}
