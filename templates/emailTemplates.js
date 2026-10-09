/**
 * Email Templates for Kenya Red Cross Society - Kirinyaga University Chapter
 * 
 * Includes:
 * 1. contactFormAdminTemplate - Sent to Admin when a user submits the frontend contact form.
 * 2. contactFormUserConfirmationTemplate - Sent to user confirming their message was received.
 * 3. passwordResetTemplate - Sent to users / admins when requesting a password reset.
 * 4. directMessageNotificationTemplate - Sent to user/admin when someone direct-messages/replies to them.
 * 5. broadcastAnnouncementTemplate - Sent to users when an official broadcast is published.
 */

const RED_CROSS_RED = '#DC2626';
const RED_CROSS_DARK = '#991B1B';
const BRAND_GRAY = '#1F2937';
const LIGHT_BG = '#F3F4F6';

/**
 * Common HTML wrapper with Red Cross branding
 */
function emailLayout({ title, preheader, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${LIGHT_BG};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #374151;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: ${LIGHT_BG};
      padding: 30px 10px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
      border: 1px solid #E5E7EB;
    }
    .header {
      background: linear-gradient(135deg, ${RED_CROSS_RED} 0%, ${RED_CROSS_DARK} 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
    }
    .header-cross {
      display: inline-block;
      width: 44px;
      height: 44px;
      line-height: 40px;
      background-color: #ffffff;
      color: ${RED_CROSS_RED};
      font-size: 28px;
      font-weight: bold;
      border-radius: 50%;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
      letter-spacing: 0.3px;
    }
    .body-content {
      padding: 32px 28px;
    }
    .info-card {
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-left: 4px solid ${RED_CROSS_RED};
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .info-row {
      margin-bottom: 10px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      font-weight: 600;
      color: #4B5563;
      display: inline-block;
      min-width: 110px;
    }
    .info-val {
      color: #111827;
    }
    .message-box {
      background-color: #FFFFFF;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 18px;
      margin: 20px 0;
      font-size: 15px;
      color: #1F2937;
      white-space: pre-line;
      line-height: 1.7;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0 16px 0;
    }
    .btn {
      display: inline-block;
      background-color: ${RED_CROSS_RED};
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.35);
    }
    .btn-secondary {
      background-color: #374151;
      box-shadow: 0 2px 6px rgba(55, 65, 81, 0.25);
      margin-left: 8px;
    }
    .token-box {
      background: #F3F4F6;
      border: 2px dashed #9CA3AF;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      font-weight: bold;
      color: #111827;
      letter-spacing: 1.5px;
      margin: 20px 0;
      word-break: break-all;
    }
    .alert-box {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      color: #92400E;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      margin: 18px 0;
    }
    .footer {
      background-color: #F9FAFB;
      border-top: 1px solid #E5E7EB;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
    }
    .footer a {
      color: ${RED_CROSS_RED};
      text-decoration: none;
    }
    .footer-principles {
      margin-top: 10px;
      font-weight: 600;
      color: #9CA3AF;
      letter-spacing: 0.5px;
    }
    @media only screen and (max-width: 600px) {
      .body-content {
        padding: 24px 18px;
      }
      .btn {
        display: block;
        width: 100%;
        margin-bottom: 10px;
        box-sizing: border-box;
      }
      .btn-secondary {
        margin-left: 0;
      }
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || ''}
  </div>
  <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <div class="email-container">
          <div class="header">
            <div class="header-cross">✚</div>
            <h1>Kenya Red Cross Society</h1>
            <p>Kirinyaga University Chapter</p>
          </div>
          <div class="body-content">
            ${content}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">
              <strong>Kenya Red Cross Society — Kirinyaga University Chapter</strong><br/>
              Kirinyaga University, Kutus, Kenya | <a href="mailto:redcross@kyu.ac.ke">redcross@kyu.ac.ke</a>
            </p>
            <p class="footer-principles">
              Humanity • Neutrality • Voluntary Service • Unity
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Contact Form Notification (Sent to Admin Portal Admin / waruijohnkar@gmail.com)
 */
export function contactFormAdminTemplate({
  firstName,
  lastName,
  email,
  phone = 'Not provided',
  subject,
  message,
  submittedAt = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
  adminPortalUrl = 'http://localhost:5174',
}) {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Website Visitor';
  const subjectDisplay = subject || 'General Inquiry';

  const content = `
    <h2 style="margin-top: 0; color: #111827; font-size: 18px;">
      📬 New Contact Inquiry Received
    </h2>
    <p style="color: #4B5563; font-size: 14px;">
      A new message has just been submitted through the <strong>Kirinyaga University Red Cross website contact form</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Sender Name:</span>
        <span class="info-val"><strong>${fullName}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Sender Email:</span>
        <span class="info-val"><a href="mailto:${email}" style="color: ${RED_CROSS_RED}; text-decoration: none;">${email}</a></span>
      </div>
      ${phone && phone !== 'Not provided' ? `
      <div class="info-row">
        <span class="info-label">Phone Number:</span>
        <span class="info-val"><a href="tel:${phone}" style="color: #111827; text-decoration: none;">${phone}</a></span>
      </div>` : ''}
      <div class="info-row">
        <span class="info-label">Subject:</span>
        <span class="info-val"><strong>${subjectDisplay}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time:</span>
        <span class="info-val">${submittedAt}</span>
      </div>
    </div>

    <p style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
      Message Content:
    </p>
    <div class="message-box">
      ${message ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No message content.'}
    </div>

    <div class="btn-container">
      <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subjectDisplay)} - Kenya Red Cross KyU" class="btn">
        ✉ Reply Directly to ${firstName || 'Sender'}
      </a>
      <a href="${adminPortalUrl}" class="btn btn-secondary">
        📊 Open Admin Portal
      </a>
    </div>

    <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 16px;">
      This inquiry has also been logged into the Red Cross Admin Messages inbox.
    </p>
  `;

  return emailLayout({
    title: `[Contact Form] ${subjectDisplay} - ${fullName}`,
    preheader: `New inquiry from ${fullName} (${email}): "${subjectDisplay}"`,
    content,
  });
}

/**
 * 2. Contact Form Confirmation (Sent to the User who contacted)
 */
export function contactFormUserConfirmationTemplate({
  firstName,
  lastName,
  email,
  subject,
  message,
}) {
  const name = firstName || 'there';
  const subjectDisplay = subject || 'General Inquiry';

  const content = `
    <h2 style="margin-top: 0; color: #111827; font-size: 18px;">
      Thank You for Reaching Out!
    </h2>
    <p style="color: #4B5563; font-size: 14px;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="color: #4B5563; font-size: 14px;">
      We have received your message regarding <strong>"${subjectDisplay}"</strong>. Our chapter coordination team is reviewing your inquiry and will get back to you as soon as possible.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Subject:</span>
        <span class="info-val"><strong>${subjectDisplay}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Your Email:</span>
        <span class="info-val">${email}</span>
      </div>
    </div>

    <p style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
      Summary of your message:
    </p>
    <div class="message-box">
      ${message ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}
    </div>

    <div class="alert-box">
      💡 <strong>Need urgent assistance or emergency first aid?</strong><br/>
      Please reach out to the university emergency response desk or call chapter dispatch directly at +254 700 000 000.
    </div>

    <p style="color: #4B5563; font-size: 14px; margin-top: 20px;">
      Warm regards,<br/>
      <strong>Kenya Red Cross Society</strong><br/>
      Kirinyaga University Chapter
    </p>
  `;

  return emailLayout({
    title: 'Thank You for Contacting Kenya Red Cross KyU Chapter',
    preheader: `We have received your message regarding "${subjectDisplay}". Our team will reply shortly.`,
    content,
  });
}

/**
 * 3. Password Reset Template (Sent to Admin / Member when resetting password)
 */
export function passwordResetTemplate({
  name = 'Administrator',
  email,
  resetLink,
  resetToken,
  expiresInMinutes = 60,
}) {
  const content = `
    <h2 style="margin-top: 0; color: #111827; font-size: 18px;">
      🔒 Password Reset Request
    </h2>
    <p style="color: #4B5563; font-size: 14px;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="color: #4B5563; font-size: 14px;">
      We received a request to reset the password for your account associated with <strong>${email}</strong>.
    </p>
    <p style="color: #4B5563; font-size: 14px;">
      Click the button below to choose a new password. For security purposes, this link will expire in <strong>${expiresInMinutes} minutes</strong>.
    </p>

    <div class="btn-container">
      <a href="${resetLink}" class="btn">
        🔑 Reset Your Password
      </a>
    </div>

    <div class="alert-box">
      ⚠️ <strong>Security Notice:</strong><br/>
      If you did not initiate this request, you can safely ignore this email. Your current password will remain unchanged and your account is secure.
    </div>

    <p style="font-size: 13px; color: #6B7280; margin-top: 24px;">
      If the button above does not work, copy and paste this link into your web browser:
    </p>
    <p style="font-size: 12px; word-break: break-all; color: ${RED_CROSS_RED}; background: #F3F4F6; padding: 8px 12px; border-radius: 4px;">
      <a href="${resetLink}" style="color: ${RED_CROSS_RED}; text-decoration: underline;">${resetLink}</a>
    </p>
    ${resetToken ? `
    <p style="font-size: 13px; color: #6B7280; margin-top: 16px;">
      Or use your manual reset token:
    </p>
    <div class="token-box">
      ${resetToken}
    </div>
    ` : ''}

    <p style="color: #4B5563; font-size: 14px; margin-top: 24px;">
      Stay safe,<br/>
      <strong>Security Team</strong><br/>
      Kenya Red Cross KyU Chapter
    </p>
  `;

  return emailLayout({
    title: 'Kenya Red Cross KyU — Password Reset Request',
    preheader: 'Use this secure link to reset your account password. Expires in 60 minutes.',
    content,
  });
}

/**
 * 4. Direct Message Notification Template (Sent to recipient when receiving a chat or reply)
 */
export function directMessageNotificationTemplate({
  senderName = 'Red Cross Member',
  senderEmail,
  receiverName = 'Member',
  subject = 'New Message',
  message,
  portalUrl = 'http://localhost:5173/portal/messages',
}) {
  const content = `
    <h2 style="margin-top: 0; color: #111827; font-size: 18px;">
      💬 You Have a New Message
    </h2>
    <p style="color: #4B5563; font-size: 14px;">
      Hello <strong>${receiverName}</strong>,
    </p>
    <p style="color: #4B5563; font-size: 14px;">
      <strong>${senderName}</strong> has sent you a direct message on the Kenya Red Cross Portal.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">From:</span>
        <span class="info-val"><strong>${senderName}</strong> ${senderEmail ? `(${senderEmail})` : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Topic / Subject:</span>
        <span class="info-val"><strong>${subject}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Sent At:</span>
        <span class="info-val">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
      </div>
    </div>

    <p style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
      Message Content:
    </p>
    <div class="message-box">
      ${message ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}
    </div>

    <div class="btn-container">
      <a href="${portalUrl}" class="btn">
        💬 Open Portal to Reply
      </a>
      ${senderEmail ? `
      <a href="mailto:${senderEmail}?subject=Re: ${encodeURIComponent(subject)}" class="btn btn-secondary">
        ✉ Reply via Email
      </a>` : ''}
    </div>

    <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 16px;">
      You received this because you are a registered member or administrator of the Kenya Red Cross Kirinyaga University Chapter.
    </p>
  `;

  return emailLayout({
    title: `New Message from ${senderName}: ${subject}`,
    preheader: `New message from ${senderName}: "${(message || '').slice(0, 80)}..."`,
    content,
  });
}

/**
 * 5. Broadcast Announcement Template (Sent when an admin or leader broadcasts to everyone)
 */
export function broadcastAnnouncementTemplate({
  senderName = 'Red Cross Administration',
  subject = 'Chapter Announcement',
  message,
  portalUrl = 'http://localhost:5173/portal/messages',
}) {
  const content = `
    <h2 style="margin-top: 0; color: #111827; font-size: 18px;">
      📢 New Chapter Broadcast Announcement
    </h2>
    <p style="color: #4B5563; font-size: 14px;">
      An official announcement has been published by <strong>${senderName}</strong>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Announcement:</span>
        <span class="info-val"><strong>${subject}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Published:</span>
        <span class="info-val">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
      </div>
    </div>

    <div class="message-box" style="border-left: 4px solid #DC2626;">
      ${message ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}
    </div>

    <div class="btn-container">
      <a href="${portalUrl}" class="btn">
        📱 View & Discuss in Portal
      </a>
    </div>
  `;

  return emailLayout({
    title: `[Announcement] ${subject}`,
    preheader: `Official announcement: "${subject}" - ${(message || '').slice(0, 80)}...`,
    content,
  });
}

/**
 * 6. Member Registration Welcome Template
 * Sent to newly registered members with default password and guide on changing password in profile.
 */
export function memberWelcomeTemplate({
  name = 'Valued Member',
  email,
  defaultPassword = 'Redcross',
  role = 'Member',
  loginUrl = 'http://localhost:5173/login',
  profileUrl = 'http://localhost:5173/portal/profile',
}) {
  const content = `
    <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">
      🎉 Welcome to the Kenya Red Cross Society!
    </h2>
    <p style="color: #374151; font-size: 15px;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
      You have been officially registered as a <strong>${role}</strong> of the <strong>Kenya Red Cross Society — Kirinyaga University Chapter</strong>. Your member account has been created and is ready for login.
    </p>

    <!-- Account Credentials Card -->
    <div class="info-card" style="background-color: #FEF2F2; border-left: 4px solid ${RED_CROSS_RED}; padding: 18px 20px;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: ${RED_CROSS_DARK}; font-size: 15px;">
        🔐 Your Account Login Credentials
      </h3>
      <div class="info-row">
        <span class="info-label">Portal Email:</span>
        <span class="info-val"><strong>${email}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Default Password:</span>
        <span class="info-val"><strong style="font-family: monospace; font-size: 15px; color: ${RED_CROSS_RED}; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px dashed ${RED_CROSS_RED};">${defaultPassword}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Chapter Role:</span>
        <span class="info-val"><strong>${role}</strong></span>
      </div>
    </div>

    <!-- Login CTA Button -->
    <div class="btn-container">
      <a href="${loginUrl}" class="btn">
        🚀 Log In to Member Portal
      </a>
    </div>

    <!-- Step-by-step Guide to Change Password -->
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin-top: 0; color: #111827; font-size: 15px; font-weight: 700; display: flex; align-items: center;">
        📋 How to Change Your Password in Your Profile Section:
      </h3>
      <ol style="color: #4B5563; font-size: 13.5px; padding-left: 20px; margin-bottom: 0; line-height: 1.7;">
        <li style="margin-bottom: 8px;">
          Go to the <strong><a href="${loginUrl}" style="color: ${RED_CROSS_RED}; font-weight: 600;">Member Portal Login</a></strong> and sign in with your email (<code>${email}</code>) and default password: <strong><code>${defaultPassword}</code></strong>.
        </li>
        <li style="margin-bottom: 8px;">
          Click on your <strong>Profile</strong> icon in the top-right corner or select <strong>Profile</strong> from the sidebar navigation menu.
        </li>
        <li style="margin-bottom: 8px;">
          Navigate to the <strong>"Change Password"</strong> section in your profile.
        </li>
        <li style="margin-bottom: 8px;">
          Enter your current temporary password (<strong><code>${defaultPassword}</code></strong>), then enter your new secure password and confirm it.
        </li>
        <li>
          Click <strong>"Update Password"</strong> to save your new confidential password.
        </li>
      </ol>
    </div>

    <div class="alert-box">
      💡 <strong>Important Security Tip:</strong><br/>
      For your security, please update your default password immediately upon your first login.
    </div>

    <p style="color: #4B5563; font-size: 14px; margin-top: 24px;">
      We are thrilled to have you as part of our humanitarian mission.<br/><br/>
      Warm regards,<br/>
      <strong>Executive Committee & Administration</strong><br/>
      Kenya Red Cross Society — Kirinyaga University Chapter
    </p>
  `;

  return emailLayout({
    title: 'Welcome to Kenya Red Cross KyU Chapter — Account Details & Access Guide',
    preheader: `Welcome to Kenya Red Cross KyU Chapter! Your temporary password is "${defaultPassword}". Log in and secure your account.`,
    content,
  });
}

