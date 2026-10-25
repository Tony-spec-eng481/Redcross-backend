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

/**
 * 7. First Aid Guide Approval & Announcement Template
 * Sent to all chapter members when a new first aid guide is approved by the admin.
 */
export function firstAidAnnouncementTemplate({
  title,
  category = 'Emergency Care',
  content: guideContent = '',
  imageUrl = '',
  videoUrl = '',
  mediaType = 'image',
  submittedByName = '',
  portalUrl = 'http://localhost:5173/portal/firstaid',
}) {
  const contentExcerpt = guideContent
    ? guideContent.length > 320
      ? `${guideContent.slice(0, 320)}...`
      : guideContent
    : 'A new emergency first aid protocol has been verified and published to the portal.';

  const formattedExcerpt = contentExcerpt
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">${line}</p>`)
    .join('');

  const mediaSection = (() => {
    if (imageUrl) {
      return `
        <div style="margin: 20px 0; text-align: center;">
          <a href="${portalUrl}" style="text-decoration: none; display: block;">
            <img src="${imageUrl}" alt="${title}" style="max-width: 100%; height: auto; max-height: 280px; object-fit: cover; border-radius: 8px; border: 1px solid #E5E7EB; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />
          </a>
        </div>
      `;
    }
    if (videoUrl) {
      return `
        <div style="margin: 20px 0; background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 8px; padding: 24px 16px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background-color: ${RED_CROSS_RED}; color: #ffffff; font-size: 24px; margin-bottom: 8px;">▶</div>
          <div style="font-size: 14px; font-weight: 600; color: #F3F4F6;">Video Demonstration Available</div>
          <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Watch the full high-definition first aid technique in your member portal</div>
        </div>
      `;
    }
    return '';
  })();

  const submitterBadge = submittedByName
    ? `
      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 10px 14px; margin: 16px 0; font-size: 13px; color: #166534; display: flex; align-items: center;">
        <span>✅ <strong>Contributed by:</strong> ${submittedByName} &bull; <em>Reviewed & Approved by Medical Committee</em></span>
      </div>
    `
    : `
      <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 10px 14px; margin: 16px 0; font-size: 13px; color: ${RED_CROSS_DARK};">
        <span>🛡️ <strong>Official Protocol:</strong> Issued by Kenya Red Cross Medical & Training Department</span>
      </div>
    `;

  const content = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #FEE2E2; color: ${RED_CROSS_RED}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 12px; border: 1px solid #FECACA;">
        🚑 First Aid & Emergency Guide
      </span>
    </div>

    <h2 style="margin-top: 0; margin-bottom: 8px; color: #111827; font-size: 22px; font-weight: 800; line-height: 1.3; text-align: center;">
      ${title}
    </h2>

    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #E5E7EB; color: #374151; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">
        Category: ${category}
      </span>
    </div>

    ${mediaSection}

    ${submitterBadge}

    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1F2937; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 12px;">
        📖 Overview & Key Steps Preview
      </h3>
      ${formattedExcerpt}
    </div>

    <!-- CTA Button -->
    <div class="btn-container" style="text-align: center; margin: 28px 0 20px 0;">
      <a href="${portalUrl}" class="btn" style="background: linear-gradient(135deg, ${RED_CROSS_RED} 0%, ${RED_CROSS_DARK} 100%); color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
        🏥 View Full First Aid Guide on Portal &rarr;
      </a>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 12px; color: #6B7280;">
        Access step-by-step illustrations, video guides, and emergency checklists directly on your portal.
      </span>
    </div>

    <div class="alert-box" style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 12.5px; color: #92400E; margin-top: 24px;">
      ⚠️ <strong>Emergency Notice:</strong> This guide provides essential first aid steps for trained volunteers and responders. In case of critical life-threatening situations, always alert professional emergency medical services immediately (Dial <strong>999</strong> or Kenya Red Cross Hotline <strong>1199</strong>).
    </div>

    <p style="color: #4B5563; font-size: 13.5px; margin-top: 24px; line-height: 1.6;">
      Stay prepared. Save lives.<br/><br/>
      Best regards,<br/>
      <strong>First Aid & Emergency Response Team</strong><br/>
      Kenya Red Cross Society — Kirinyaga University Chapter
    </p>
  `;

  return emailLayout({
    title: `[First Aid Alert] ${title}`,
    preheader: `New first aid resource: "${title}" (${category}). Learn the steps to save a life today.`,
    content,
  });
}

/**
 * 8. First Aid Community Question Notification Template
 * Sent to all members and admins when a user posts a question in the Q&A section.
 */
export function firstAidQuestionNotificationTemplate({
  title = '',
  questionText = '',
  askedByName = 'A Chapter Member',
  category = 'First Aid & Emergency Care',
  qnaUrl = 'http://localhost:5173/portal/firstaid?tab=ask',
}) {
  const displayTitle = title || (questionText.length > 70 ? `${questionText.slice(0, 70)}...` : questionText);

  const formattedQuestion = questionText
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p style="margin: 0 0 8px 0; color: #374151; font-size: 14.5px; line-height: 1.6;">${line}</p>`)
    .join('');

  const content = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 12px; border: 1px solid #FDE68A;">
        ❓ Community Question & Discussion
      </span>
    </div>

    <h2 style="margin-top: 0; margin-bottom: 10px; color: #111827; font-size: 21px; font-weight: 800; line-height: 1.35; text-align: center;">
      ${displayTitle}
    </h2>

    <div style="text-align: center; margin-bottom: 18px;">
      <span style="display: inline-block; background-color: #F3F4F6; color: #4B5563; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">
        Category: ${category}
      </span>
    </div>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748b;">
        <span>👤 <strong>Asked by:</strong> ${askedByName}</span>
      </div>
      <div style="color: #1F2937;">
        ${formattedQuestion}
      </div>
    </div>

    <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #1E40AF; margin: 20px 0;">
      💡 <strong>Can you answer this question?</strong> Your medical experience and knowledge help keep our volunteers and community safe. Join the discussion!
    </div>

    <!-- CTA Button -->
    <div class="btn-container" style="text-align: center; margin: 28px 0 20px 0;">
      <a href="${qnaUrl}" class="btn" style="background: linear-gradient(135deg, ${RED_CROSS_RED} 0%, ${RED_CROSS_DARK} 100%); color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
        💬 View Discussion & Post an Answer &rarr;
      </a>
    </div>

    <p style="color: #64748B; font-size: 13px; margin-top: 24px; text-align: center;">
      Kenya Red Cross Society &mdash; Kirinyaga University Chapter Emergency Knowledge Hub
    </p>
  `;

  return emailLayout({
    title: `[Q&A Alert] ${displayTitle}`,
    preheader: `${askedByName} asked: "${displayTitle}". Read and answer on the member portal.`,
    content,
  });
}

/**
 * 9. Dissemination & IHL Knowledge Announcement Template
 * Sent to all active members when a new Dissemination module is published by an admin.
 */
export function disseminationAnnouncementTemplate({
  title = '',
  category = 'Fundamental Principles',
  description = '',
  contentExcerpt = '',
  imageUrl = '',
  videoUrl = '',
  documentUrl = '',
  tags = [],
  portalUrl = 'http://localhost:5173/portal/dissemination',
}) {
  const mediaSection = imageUrl
    ? `
      <div style="text-align: center; margin: 20px 0;">
        <img src="${imageUrl}" alt="${title}" style="max-width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; border: 1px solid #E5E7EB; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />
      </div>
    `
    : '';

  const cleanDescription = description
    ? `<div style="background-color: #FEF2F2; border-left: 4px solid ${RED_CROSS_RED}; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 18px 0; font-size: 14.5px; color: ${RED_CROSS_DARK}; font-weight: 500; line-height: 1.5;">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
    : '';

  const formattedExcerpt = contentExcerpt
    ? `<div style="color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-line; margin-bottom: 16px;">${contentExcerpt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
    : '';

  const tagsBadge = Array.isArray(tags) && tags.length > 0
    ? `<div style="margin: 12px 0; text-align: center;">${tags.map(t => `<span style="display: inline-block; background-color: #F3F4F6; color: #4B5563; font-size: 11.5px; padding: 2px 8px; border-radius: 4px; margin: 2px 4px;">#${t}</span>`).join('')}</div>`
    : '';

  const extraResources = [];
  if (documentUrl) {
    extraResources.push(`📄 <strong>Official Document / PDF Reference Guide</strong> included`);
  }
  if (videoUrl) {
    extraResources.push(`🎥 <strong>Video Resource / Lecture Presentation</strong> included`);
  }

  const resourcesHtml = extraResources.length > 0
    ? `
      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #166534;">
        ${extraResources.map(r => `<div style="margin: 4px 0;">${r}</div>`).join('')}
      </div>
    `
    : '';

  const content = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #FEE2E2; color: ${RED_CROSS_RED}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 14px; border-radius: 12px; border: 1px solid #FECACA;">
        🌐 Dissemination & IHL Knowledge Update
      </span>
    </div>

    <h2 style="margin-top: 0; margin-bottom: 8px; color: #111827; font-size: 22px; font-weight: 800; line-height: 1.3; text-align: center;">
      ${title}
    </h2>

    <div style="text-align: center; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #E5E7EB; color: #374151; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">
        Curriculum: ${category}
      </span>
    </div>

    ${mediaSection}

    ${cleanDescription}

    ${formattedExcerpt ? `
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin: 18px 0;">
        <h3 style="margin-top: 0; color: #1F2937; font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 12px;">
          📖 Module Summary & Takeaways
        </h3>
        ${formattedExcerpt}
      </div>
    ` : ''}

    ${resourcesHtml}

    ${tagsBadge}

    <!-- CTA Button -->
    <div class="btn-container" style="text-align: center; margin: 28px 0 20px 0;">
      <a href="${portalUrl}" class="btn" style="background: linear-gradient(135deg, ${RED_CROSS_RED} 0%, ${RED_CROSS_DARK} 100%); color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
        🌐 Read Full Dissemination Module on Portal &rarr;
      </a>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 12px; color: #6B7280;">
        Deepen your knowledge of the Geneva Conventions, emblem rules, and our seven core principles.
      </span>
    </div>

    <div style="border-top: 1px solid #E5E7EB; padding-top: 18px; margin-top: 24px; text-align: center;">
      <p style="font-size: 11.5px; color: #6B7280; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.6px;">
        The 7 Fundamental Principles of the International Red Cross Movement
      </p>
      <p style="font-size: 11px; color: #9CA3AF; margin: 0; line-height: 1.5;">
        Humanity &bull; Impartiality &bull; Neutrality &bull; Independence &bull; Voluntary Service &bull; Unity &bull; Universality
      </p>
    </div>

    <p style="color: #4B5563; font-size: 13.5px; margin-top: 24px; line-height: 1.6;">
      Warm humanitarian regards,<br/><br/>
      <strong>Dissemination & IHL Department</strong><br/>
      Kenya Red Cross Society &mdash; Kirinyaga University Chapter
    </p>
  `;

  return emailLayout({
    title: `[Dissemination Bulletin] ${title}`,
    preheader: `New Dissemination Module: "${title}" under ${category}. Explore Red Cross principles & IHL now.`,
    content,
  });
}



