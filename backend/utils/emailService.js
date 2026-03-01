const nodemailer = require("nodemailer");

// ── Create transporter ────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// ── Base HTML wrapper ─────────────────────────────────────
const wrap = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin:0; padding:0; }
    .container { max-width: 560px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(90deg, #0f3460, #e94560); padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 28px 32px; color: #333; line-height: 1.6; }
    .otp-box { background: #f0f4ff; border: 2px dashed #0f3460; border-radius: 10px; text-align: center; padding: 20px; margin: 20px 0; }
    .otp-code { font-size: 36px; font-weight: 900; color: #0f3460; letter-spacing: 8px; }
    .otp-note { font-size: 12px; color: #888; margin-top: 8px; }
    .highlight-box { background: #f8f9ff; border-left: 4px solid #0f3460; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .footer { background: #f8f8f8; padding: 16px 32px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; }
    .badge { display: inline-block; background: #e0e7ff; color: #0f3460; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 BVRITH Alunite</h1>
      <p>${title}</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">BVRIT Hyderabad College of Engineering for Women &bull; Department of IT</div>
  </div>
</body>
</html>`;

// ── Send helper ───────────────────────────────────────────
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"BVRITH Alunite" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✉️  Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    // Don't throw — email failure should never break the main flow
  }
}

// ══════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════

// 1. OTP Verification
exports.sendOTPEmail = async (to, otp) => {
  const html = wrap("Email Verification", `
    <p>Hi there! 👋</p>
    <p>Thank you for registering on <strong>BVRITH Alunite</strong>. To complete your registration, please verify your email address using the OTP below:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-note">This OTP expires in <strong>10 minutes</strong></div>
    </div>
    <p>If you did not register on BVRITH Alunite, please ignore this email.</p>
  `);
  await sendEmail(to, "🔐 Verify Your Email - BVRITH Alunite", html);
};

// 2. Welcome email after verification
exports.sendWelcomeEmail = async (to, role) => {
  const html = wrap("Welcome to BVRITH Alunite!", `
    <p>Hi! 🎉</p>
    <p>Your email has been verified successfully. Welcome to <strong>BVRITH Alunite</strong> — your college's alumni-student platform.</p>
    <div class="highlight-box">
      <strong>Your role:</strong> <span class="badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
      <br/><br/>
      ${role === "student"
        ? "You can now find mentors, browse the alumni directory, message alumni, register for events, and upload your resume."
        : "You can now mentor students, respond to mentorship requests, create events, and connect with the BVRITH community."}
    </div>
    <p>Log in to get started!</p>
  `);
  await sendEmail(to, "🎓 Welcome to BVRITH Alunite!", html);
};

// 3. Mentorship request received (to alumni)
exports.sendMentorshipRequestEmail = async (alumniEmail, studentName, studentEmail, matchScore) => {
  const html = wrap("New Mentorship Request", `
    <p>Hi! 👋</p>
    <p>A student has sent you a mentorship request on <strong>BVRITH Alunite</strong>.</p>
    <div class="highlight-box">
      <strong>Student:</strong> ${studentName || studentEmail}<br/>
      <strong>Email:</strong> ${studentEmail}<br/>
      <strong>AI Match Score:</strong> ${Math.round(matchScore * 100)}% compatibility
    </div>
    <p>Log in to your dashboard → <strong>Mentorship Requests</strong> to accept or decline.</p>
  `);
  await sendEmail(alumniEmail, "🤝 New Mentorship Request - BVRITH Alunite", html);
};

// 4. Mentorship accepted (to student)
exports.sendMentorshipAcceptedEmail = async (studentEmail, alumniName, alumniEmail) => {
  const html = wrap("Mentorship Request Accepted!", `
    <p>Great news! 🎉</p>
    <p>Your mentorship request has been <strong>accepted</strong>.</p>
    <div class="highlight-box">
      <strong>Your Mentor:</strong> ${alumniName || alumniEmail}<br/>
      <strong>Email:</strong> ${alumniEmail}
    </div>
    <p>You can now message your mentor directly through the platform. Log in and go to <strong>Messages</strong> to start a conversation!</p>
  `);
  await sendEmail(studentEmail, "✅ Mentorship Accepted - BVRITH Alunite", html);
};

// 5. Mentorship rejected (to student)
exports.sendMentorshipRejectedEmail = async (studentEmail, alumniName) => {
  const html = wrap("Mentorship Request Update", `
    <p>Hi,</p>
    <p>Unfortunately, <strong>${alumniName || "the alumni"}</strong> was unable to accept your mentorship request at this time.</p>
    <p>Don't worry — there are many other experienced alumni on the platform. Log in and use <strong>Find a Mentor</strong> to discover other great matches!</p>
  `);
  await sendEmail(studentEmail, "ℹ️ Mentorship Request Update - BVRITH Alunite", html);
};

// 6. New announcement (to users)
exports.sendAnnouncementEmail = async (toList, title, content) => {
  const html = wrap("New Announcement", `
    <p>📣 A new announcement has been posted on <strong>BVRITH Alunite</strong>:</p>
    <div class="highlight-box">
      <strong>${title}</strong><br/><br/>
      ${content}
    </div>
    <p>Log in to your dashboard to see all announcements.</p>
  `);
  // Send to each user (in real system use BCC or batch)
  for (const email of toList) {
    await sendEmail(email, `📣 ${title} - BVRITH Alunite`, html);
  }
};

// 7. Event registration confirmation
exports.sendEventRegistrationEmail = async (to, eventTitle, eventDate, eventTime, venue) => {
  const html = wrap("Event Registration Confirmed", `
    <p>Hi! 🎉</p>
    <p>You have successfully registered for the following event:</p>
    <div class="highlight-box">
      <strong>📅 ${eventTitle}</strong><br/>
      <strong>Date:</strong> ${new Date(eventDate).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}<br/>
      <strong>Time:</strong> ${eventTime}<br/>
      <strong>Venue:</strong> ${venue}
    </div>
    <p>We look forward to seeing you there! Log in to view event details or cancel your registration.</p>
  `);
  await sendEmail(to, `🗓️ Registered: ${eventTitle} - BVRITH Alunite`, html);
};

// 8. New message notification
exports.sendMessageNotificationEmail = async (to, senderName) => {
  const html = wrap("New Message", `
    <p>Hi! 💬</p>
    <p><strong>${senderName}</strong> has sent you a message on <strong>BVRITH Alunite</strong>.</p>
    <p>Log in to read and reply to their message.</p>
  `);
  await sendEmail(to, `💬 New message from ${senderName} - BVRITH Alunite`, html);
};

// 9. Alumni profile rejected
exports.sendAlumniRejectedEmail = async (to) => {
  const html = wrap("Profile Not Approved", `
    <p>Hi,</p>
    <p>Unfortunately your alumni profile on <strong>BVRITH Alunite</strong> was not approved by the admin.</p>
    <p>Your account data has been removed. If you believe this is a mistake, please contact the institution's IT department directly.</p>
  `);
  await sendEmail(to, "BVRITH Alunite — Alumni Profile Not Approved", html);
};

// 10. Notify admin when a new event is created
exports.sendEventCreatedAdminEmail = async (adminEmail, event, creatorEmail) => {
  const html = wrap("New Event Created", `
    <p>A new event has been published on <strong>BVRITH Alunite</strong>.</p>
    <div class="highlight-box">
      <strong>📅 ${event.title}</strong><br/><br/>
      <strong>Date:</strong> ${new Date(event.date).toLocaleDateString("en-IN", {weekday:"long",day:"numeric",month:"long",year:"numeric"})}<br/>
      <strong>Time:</strong> ${event.time}<br/>
      <strong>Venue:</strong> ${event.venue}<br/>
      <strong>Mode:</strong> ${event.mode}<br/>
      <strong>Category:</strong> ${event.category}<br/>
      <strong>Created by:</strong> ${creatorEmail}
    </div>
    <p>Log in to the Admin Panel → Events tab to manage registrations.</p>
  `);
  await sendEmail(
  adminEmail,
  `📅 New Event: ${event.title} — BVRITH Alunite`,
  html
);
};
