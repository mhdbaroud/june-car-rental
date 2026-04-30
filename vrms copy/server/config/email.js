const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ─── Shared layout ─────────────────────────────────────────────────────── */
const wrap = (body, footerNote = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(10,38,71,0.12);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(160deg,#0a2647 0%,#0f3460 50%,#1a4b8c 100%);padding:48px 40px 40px;text-align:center;position:relative;">
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 70% 20%,rgba(233,69,96,0.1) 0%,transparent 60%);pointer-events:none;"></div>
            <div style="position:relative;z-index:1;">
              <div style="display:inline-block;background:rgba(233,69,96,0.12);border:1px solid rgba(233,69,96,0.25);border-radius:50px;padding:6px 20px;margin-bottom:20px;">
                <span style="color:#e94560;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">JUNE. Car Rental</span>
              </div>
              <div style="color:#ffffff;font-family:'Playfair Display',serif;font-size:44px;font-weight:800;letter-spacing:2px;line-height:1;margin:0;">JUNE.</div>
              <div style="color:rgba(255,255,255,0.5);font-size:12px;letter-spacing:3.5px;margin-top:8px;text-transform:uppercase;font-weight:500;">Premium Car Rental</div>
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:44px 40px;">
            ${body}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:linear-gradient(180deg,#0a1628 0%,#0f3460 100%);padding:36px 40px;text-align:center;">
            <div style="margin-bottom:16px;">
              <span style="color:#e94560;font-family:'Playfair Display',serif;font-size:22px;font-weight:700;letter-spacing:1px;">JUNE.</span>
            </div>
            <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 8px;line-height:1.6;">Premium car rental service serving customers across Turkey.</p>
            <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0 0 6px;">© 2026 JUNE. Car Rental · All rights reserved</p>
            ${footerNote ? `<p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">${footerNote}</p>` : ''}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const badge = (color, bg, text) =>
  `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:1.5px;padding:5px 16px;border-radius:50px;text-transform:uppercase;">${text}</span>`;

const divider = () =>
  `<div style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);margin:32px 0;"></div>`;

const infoRow = (label, value) =>
  `<tr>
    <td style="padding:12px 0;color:#94a3b8;font-size:13px;width:160px;vertical-align:top;font-weight:500;">${label}</td>
    <td style="padding:12px 0;color:#1a1a2e;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;

const ctaButton = (href, text, bg = '#e94560') =>
  `<a href="${href}" style="display:inline-block;background:${bg};color:#fff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;transition:all 0.3s;">${text}</a>`;

const alertBox = (bg, border, textColor, content) =>
  `<div style="background:${bg};border-left:4px solid ${border};border-radius:0 12px 12px 0;padding:18px 22px;margin:24px 0;">
    <p style="color:${textColor};font-size:13.5px;margin:0;line-height:1.7;font-weight:500;">${content}</p>
  </div>`;

/* ─── 1. Verification Code ──────────────────────────────────────────────── */
const sendVerificationCode = async (email, code, name) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your JUNE. Login Verification Code',
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#e94560', 'rgba(233,69,96,0.08)', 'Secure Login')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Two-Factor Verification</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hello <strong style="color:#0f3460;">${name}</strong>, here is your login code.</p>
      </div>

      ${divider()}

      <p style="color:#64748b;font-size:14px;text-align:center;margin:0 0 24px;line-height:1.7;">Enter this code to complete your sign-in. It expires in <strong style="color:#1a1a2e;">10 minutes</strong>.</p>

      <div style="background:#fafbfc;border:1.5px solid #e2e8f0;border-radius:16px;padding:36px;text-align:center;margin:0 0 32px;">
        <div style="font-size:52px;font-weight:800;letter-spacing:16px;color:#0f3460;font-family:'Courier New',monospace;line-height:1;">${code}</div>
      </div>

      ${alertBox('rgba(100,116,139,0.05)', '#94a3b8', '#64748b', 'This code is valid for <strong>10 minutes</strong>. If you did not attempt to log in to JUNE., you can safely ignore this email — your account is secure.')}
    `, 'This is an automated security email from JUNE. Car Rental.')
  });
};

/* ─── 2. Password Reset ─────────────────────────────────────────────────── */
const sendPasswordReset = async (email, name, code) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your JUNE. Password',
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#f59e0b', 'rgba(245,158,11,0.08)', 'Password Reset')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Reset Your Password</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, use the code below to set a new password.</p>
      </div>

      ${divider()}

      <p style="color:#64748b;font-size:14px;text-align:center;margin:0 0 24px;line-height:1.7;">Your password reset code expires in <strong style="color:#1a1a2e;">15 minutes</strong>.</p>

      <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:16px;padding:36px;text-align:center;margin:0 0 32px;">
        <div style="font-size:52px;font-weight:800;letter-spacing:16px;color:#92400e;font-family:'Courier New',monospace;line-height:1;">${code}</div>
      </div>

      ${alertBox('rgba(239,68,68,0.04)', '#ef4444', '#991b1b', 'If you did not request a password reset, your account may be at risk. Please secure your account immediately or ignore this email if it was a mistake.')}
    `, 'This is an automated security email from JUNE. Car Rental.')
  });
};

/* ─── 3. Booking Received ───────────────────────────────────────────────── */
const sendBookingReceived = async (email, name, booking) => {
  const fmt = d => new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Received — ${booking.brand} ${booking.model} #${booking.id}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#3b82f6', 'rgba(59,130,246,0.08)', 'Received')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">We've Received Your Booking!</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, we've successfully received your booking and payment. Our team will review your details and confirm your reservation shortly.</p>
      </div>

      ${divider()}

      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Booking Details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Pickup', fmt(booking.start_date))}
          ${infoRow('Return', fmt(booking.end_date))}
          ${infoRow('Total', `<span style="color:#0f3460;font-size:18px;font-weight:800;font-family:'Playfair Display',serif;">$${booking.total_price}</span>`)}
        </table>
      </div>

      ${alertBox('rgba(59,130,246,0.05)', '#3b82f6', '#1e40af', 'Your booking and payment are under review. You will receive another email once your reservation is confirmed.')}

      <div style="text-align:center;margin-top:32px;">
        ${ctaButton((process.env.CLIENT_URL || 'http://localhost:3000') + '/my-bookings', 'View My Bookings', '#0f3460')}
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:28px 0 0;line-height:1.7;">Questions? Reach us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0f3460;font-weight:600;text-decoration:none;">${process.env.EMAIL_USER}</a></p>
    `)
  });
};

/* ─── 4. Booking Confirmation ───────────────────────────────────────────── */
const sendBookingConfirmation = async (email, name, booking) => {
  const methodLabel = { credit_card: 'Credit Card', debit_card: 'Debit Card', cash: 'Cash on Pickup' };
  const payLabel = methodLabel[booking.payment_method] || booking.payment_method || 'N/A';
  const isCash = booking.payment_method === 'cash';
  const fmt = d => new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Confirmed — ${booking.brand} ${booking.model} #${booking.id}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#22c55e', 'rgba(34,197,94,0.08)', 'Confirmed')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Your Booking is Confirmed!</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, your reservation is all set. See you on the road!</p>
      </div>

      ${divider()}

      <!-- Booking details card -->
      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Booking Details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Pickup', fmt(booking.start_date) + (booking.pickup_time ? ` · ${booking.pickup_time}` : ''))}
          ${infoRow('Return', fmt(booking.end_date) + (booking.return_time ? ` · ${booking.return_time}` : ''))}
          ${infoRow('Payment', payLabel)}
          ${infoRow('Total', `<span style="color:#0f3460;font-size:18px;font-weight:800;font-family:'Playfair Display',serif;">$${booking.total_price}</span>`)}
        </table>
      </div>

      <!-- Locations -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="48%" style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.15);border-radius:14px;padding:20px;vertical-align:top;">
            <p style="color:#22c55e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">Pickup</p>
            <p style="color:#1a1a2e;font-size:15px;font-weight:700;margin:0 0 6px;">${booking.pickup_location}</p>
            ${booking.pickup_address ? `<p style="color:#64748b;font-size:13px;margin:0;line-height:1.5;">${booking.pickup_address}</p>` : ''}
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:rgba(233,69,96,0.05);border:1px solid rgba(233,69,96,0.15);border-radius:14px;padding:20px;vertical-align:top;">
            <p style="color:#e94560;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">Return</p>
            <p style="color:#1a1a2e;font-size:15px;font-weight:700;margin:0 0 6px;">${booking.return_location}</p>
            ${booking.return_address ? `<p style="color:#64748b;font-size:13px;margin:0;line-height:1.5;">${booking.return_address}</p>` : ''}
          </td>
        </tr>
      </table>

      ${isCash ? alertBox('rgba(245,158,11,0.05)', '#f59e0b', '#92400e', `<strong>Cash Payment Reminder:</strong> Please bring <strong>$${booking.total_price}</strong> in cash when you pick up your vehicle.`) : ''}

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:28px 0 0;line-height:1.7;">Questions? Reply to this email or reach us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0f3460;font-weight:600;text-decoration:none;">${process.env.EMAIL_USER}</a></p>
    `)
  });
};

/* ─── 4. Cancellation Request ───────────────────────────────────────────── */
const sendCancellationRequest = async (email, name, booking) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Cancellation Request Received — Booking #${booking.id}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#f59e0b', 'rgba(245,158,11,0.08)', 'Under Review')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Cancellation Request Received</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, we have received your request and are reviewing it.</p>
      </div>

      ${divider()}

      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Request Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Status', '<span style="color:#f59e0b;font-weight:700;">Pending Review</span>')}
        </table>
      </div>

      ${alertBox('rgba(245,158,11,0.05)', '#f59e0b', '#92400e', 'Your cancellation request is being reviewed by our team. You will receive an email once a decision has been made. This usually takes less than 24 hours.')}

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:28px 0 0;line-height:1.7;">Questions? Reach us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0f3460;font-weight:600;text-decoration:none;">${process.env.EMAIL_USER}</a></p>
    `)
  });
};

/* ─── 5. Cancellation Approved ──────────────────────────────────────────── */
const sendCancellationApproved = async (email, name, booking) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Cancelled — #${booking.id}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#64748b', 'rgba(100,116,139,0.08)', 'Cancelled')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Booking Cancelled</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, your cancellation has been approved.</p>
      </div>

      ${divider()}

      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Cancelled Booking</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Status', '<span style="color:#64748b;font-weight:700;">Cancelled</span>')}
        </table>
      </div>

      ${alertBox('rgba(100,116,139,0.05)', '#94a3b8', '#475569', 'Your booking has been successfully cancelled. If any refund applies, it will be processed according to our cancellation policy.')}

      <div style="text-align:center;margin-top:32px;">
        <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Looking for another vehicle?</p>
        ${ctaButton((process.env.CLIENT_URL || 'http://localhost:3000') + '/vehicles', 'Browse Vehicles', '#0f3460')}
      </div>
    `)
  });
};

/* ─── 6. Cancellation Rejected ──────────────────────────────────────────── */
const sendCancellationRejected = async (email, name, booking, reason) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Cancellation Request Rejected — Booking #${booking.id}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#e94560', 'rgba(233,69,96,0.08)', 'Not Approved')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Cancellation Not Approved</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, your cancellation request could not be approved.</p>
      </div>

      ${divider()}

      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Booking Details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Status', '<span style="color:#22c55e;font-weight:700;">Still Active</span>')}
        </table>
      </div>

      ${reason ? alertBox('rgba(233,69,96,0.04)', '#e94560', '#991b1b', `<strong>Reason:</strong> ${reason}`) : ''}

      ${alertBox('rgba(15,52,96,0.04)', '#0f3460', '#0f3460', 'Your booking remains confirmed and active. If you have questions or need further assistance, please contact our support team.')}

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:28px 0 0;line-height:1.7;">Questions? Reach us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0f3460;font-weight:600;text-decoration:none;">${process.env.EMAIL_USER}</a></p>
    `)
  });
};

/* ─── 7. Booking Completed ──────────────────────────────────────────────── */
const sendBookingCompleted = async (email, name, booking) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Thank You for Riding with JUNE. — Booking #${booking.id} Completed`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#22c55e', 'rgba(34,197,94,0.08)', 'Completed')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:30px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Thank You, ${name}!</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Your rental of the <strong style="color:#0f3460;">${booking.brand} ${booking.model}</strong> is complete.<br>We hope you had an amazing experience!</p>
      </div>

      ${divider()}

      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:32px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Trip Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Total Paid', `<span style="color:#0f3460;font-size:18px;font-weight:800;font-family:'Playfair Display',serif;">$${booking.total_price}</span>`)}
        </table>
      </div>

      <!-- CTA -->
      <div style="background:linear-gradient(160deg,#0a2647 0%,#0f3460 60%,#1a1a2e 100%);border-radius:16px;padding:36px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 70% 20%,rgba(233,69,96,0.08) 0%,transparent 60%);pointer-events:none;"></div>
        <div style="position:relative;z-index:1;">
          <p style="color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Ready for your next adventure?</p>
          <p style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 28px;line-height:1.3;font-family:'Playfair Display',serif;">Explore our premium fleet<br>and hit the road again.</p>
          ${ctaButton((process.env.CLIENT_URL || 'http://localhost:3000') + '/vehicles', 'Browse Vehicles', '#e94560')}
        </div>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:32px 0 0;line-height:1.7;">Questions or feedback? <a href="mailto:${process.env.EMAIL_USER}" style="color:#0f3460;font-weight:600;text-decoration:none;">${process.env.EMAIL_USER}</a></p>
    `)
  });
};

/* ─── 8. Payment Rejected ───────────────────────────────────────────────── */
const sendPaymentRejected = async (email, name, booking, reason) => {
  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Payment Rejected — Booking #${booking.id}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge('#e94560', 'rgba(233,69,96,0.08)', 'Payment Rejected')}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Payment Not Accepted</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Hi <strong style="color:#0f3460;">${name}</strong>, unfortunately your payment submission could not be accepted.</p>
      </div>

      ${divider()}

      <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.04);box-shadow:0 2px 16px rgba(0,0,0,0.04);">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Booking Details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Booking ID', `<span style="color:#e94560;">#${booking.id}</span>`)}
          ${infoRow('Vehicle', `${booking.brand} ${booking.model}`)}
          ${infoRow('Status', '<span style="color:#f59e0b;font-weight:700;">Pending Payment</span>')}
        </table>
      </div>

      ${reason ? alertBox('rgba(233,69,96,0.04)', '#e94560', '#991b1b', `<strong>Reason:</strong> ${reason}`) : ''}

      ${alertBox('rgba(245,158,11,0.05)', '#f59e0b', '#92400e', 'Your booking is still reserved. Please resubmit your payment with the correct details to confirm your reservation.')}

      <div style="text-align:center;margin-top:32px;">
        ${ctaButton((process.env.CLIENT_URL || 'http://localhost:3000') + '/my-bookings', 'Pay Now', '#e94560')}
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:28px 0 0;line-height:1.7;">Questions? Reach us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0f3460;font-weight:600;text-decoration:none;">${process.env.EMAIL_USER}</a></p>
    `)
  });
};

/* ─── 9. Staff Welcome ──────────────────────────────────────────────────── */
const sendStaffWelcome = async (email, name, tempPassword, role) => {
  const roleLabel = { admin: 'Admin', call_center: 'Call Center', shop_worker: 'Shop Worker' }[role] || role;
  const roleColor = { admin: '#6366f1', call_center: '#0ea5e9', shop_worker: '#10b981' }[role] || '#0f3460';

  await transporter.sendMail({
    from: `"JUNE. Car Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to JUNE. — Your ${roleLabel} Account`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:36px;">
        ${badge(roleColor, `${roleColor}14`, roleLabel)}
        <h2 style="font-family:'Playfair Display',serif;color:#1a1a2e;font-size:28px;font-weight:700;margin:20px 0 10px;letter-spacing:-0.3px;">Welcome to the Team, ${name}!</h2>
        <p style="color:#64748b;font-size:15.5px;margin:0;line-height:1.7;">Your <strong style="color:#0f3460;">${roleLabel}</strong> account has been created. Here are your login credentials.</p>
      </div>

      ${divider()}

      <div style="background:#fafbfc;border:1.5px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:24px;">
        <p style="color:#0f3460;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Your Login Credentials</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Email', `<span style="color:#0f3460;">${email}</span>`)}
          ${infoRow('Temporary Password', `<span style="font-family:'Courier New',monospace;font-size:16px;color:#e94560;font-weight:700;letter-spacing:2px;">${tempPassword}</span>`)}
        </table>
      </div>

      ${alertBox('rgba(245,158,11,0.05)', '#f59e0b', '#92400e', '<strong>Action required:</strong> Please log in and change your password immediately after your first sign-in.')}

      <div style="text-align:center;margin-top:32px;">
        ${ctaButton((process.env.CLIENT_URL || 'http://localhost:3000') + '/login', 'Sign In to JUNE.', '#0f3460')}
      </div>
    `, 'This email was sent because an admin created an account for you.')
  });
};

module.exports = {
  sendVerificationCode,
  sendPasswordReset,
  sendBookingReceived,
  sendBookingConfirmation,
  sendCancellationRequest,
  sendCancellationApproved,
  sendCancellationRejected,
  sendBookingCompleted,
  sendPaymentRejected,
  sendStaffWelcome
};

