import dotenv from 'dotenv';
import {
  contactFormAdminTemplate,
  contactFormUserConfirmationTemplate,
  passwordResetTemplate,
  directMessageNotificationTemplate,
  broadcastAnnouncementTemplate,
} from '../../templates/emailTemplates.js';

dotenv.config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Get Brevo configuration from environment variables
 */
function getBrevoConfig() {
  const apiKey =
    process.env.Brevo_API ||
    process.env.BREVO_API_KEY ||
    process.env.BREVO_API ||
    '';

  const senderEmail =
    process.env.Sender_Email ||
    process.env.SENDER_EMAIL ||
    'waruijohnkar@gmail.com';

  const senderName = process.env.SENDER_NAME || 'Kenya Red Cross KyU Chapter';

  return { apiKey, senderEmail, senderName };
}

/**
 * Low-level Brevo REST API dispatcher
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
  replyTo,
}) {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  if (!apiKey) {
    console.error('❌ Brevo API key is not configured in environment variables.');
    return { success: false, error: 'Brevo API key is missing' };
  }

  // Format 'to' field: supports string or array of objects [{ email, name }]
  const recipients = Array.isArray(to)
    ? to.map((t) => (typeof t === 'string' ? { email: t } : t))
    : [{ email: to }];

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: recipients,
    subject,
    htmlContent,
  };

  if (textContent) {
    payload.textContent = textContent;
  }

  if (replyTo) {
    payload.replyTo =
      typeof replyTo === 'string' ? { email: replyTo } : replyTo;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('❌ Brevo Email API error:', data);
      return {
        success: false,
        status: response.status,
        error: data.message || 'Failed to send email via Brevo',
      };
    }

    console.log(`✅ Email sent successfully to ${recipients.map((r) => r.email).join(', ')} [MessageId: ${data.messageId || 'N/A'}]`);
    return { success: true, messageId: data.messageId, data };
  } catch (err) {
    console.error('❌ Network error while calling Brevo API:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * High-level helper: Send contact form notification to Admin & auto-reply to user
 */
export async function sendContactEmails({
  firstName,
  lastName,
  email,
  phone,
  subject,
  message,
}) {
  const { senderEmail } = getBrevoConfig();
  const adminPortalUrl = process.env.ADMIN_URL || 'http://localhost:5174';

  const results = {
    adminNotification: null,
    userConfirmation: null,
  };

  // 1. Send detailed inquiry notification to chapter admin
  try {
    const adminHtml = contactFormAdminTemplate({
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      submittedAt: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
      adminPortalUrl,
    });

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Visitor';
    results.adminNotification = await sendEmail({
      to: senderEmail, // Sent to administrator email (waruijohnkar@gmail.com)
      subject: `[Contact Form] ${subject || 'New Inquiry'} - ${fullName}`,
      htmlContent: adminHtml,
      replyTo: {
        email,
        name: fullName,
      },
    });
  } catch (err) {
    console.error('Error generating admin contact email:', err);
    results.adminNotification = { success: false, error: err.message };
  }

  // 2. Send confirmation receipt to the user who filled out the form
  if (email) {
    try {
      const userHtml = contactFormUserConfirmationTemplate({
        firstName,
        lastName,
        email,
        subject,
        message,
      });

      results.userConfirmation = await sendEmail({
        to: email,
        subject: `Thank you for contacting Kenya Red Cross - KyU Chapter`,
        htmlContent: userHtml,
      });
    } catch (err) {
      console.error('Error generating user confirmation email:', err);
      results.userConfirmation = { success: false, error: err.message };
    }
  }

  return results;
}

/**
 * High-level helper: Send Password Reset email with secure token & link
 */
export async function sendPasswordResetEmail({
  email,
  name = 'Administrator',
  resetToken,
  userType = 'admin',
}) {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const baseUrl = userType === 'admin' ? adminUrl : clientUrl;
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const html = passwordResetTemplate({
    name,
    email,
    resetLink,
    resetToken,
    expiresInMinutes: 60,
  });

  return sendEmail({
    to: email,
    subject: 'Kenya Red Cross KyU — Password Reset Request',
    htmlContent: html,
  });
}

/**
 * High-level helper: Send Direct Message or Reply email notification to recipient
 */
export async function sendDirectMessageEmail({
  toEmail,
  receiverName = 'Member',
  senderName = 'Red Cross Member',
  senderEmail,
  subject = 'New Message',
  message,
  isToAdmin = false,
}) {
  if (!toEmail) return { success: false, error: 'Recipient email is missing' };

  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const portalUrl = isToAdmin ? `${adminUrl}` : `${clientUrl}/portal/messages`;

  const html = directMessageNotificationTemplate({
    senderName,
    senderEmail,
    receiverName,
    subject,
    message,
    portalUrl,
  });

  return sendEmail({
    to: toEmail,
    subject: `💬 [Red Cross Portal] Message from ${senderName}: ${subject}`,
    htmlContent: html,
    replyTo: senderEmail ? { email: senderEmail, name: senderName } : undefined,
  });
}

/**
 * High-level helper: Send Broadcast notification to Chapter Admin / Members
 */
export async function sendBroadcastEmail({
  toEmails,
  subject = 'Official Announcement',
  message,
  senderName = 'Red Cross Administration',
}) {
  const { senderEmail } = getBrevoConfig();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const portalUrl = `${clientUrl}/portal/messages`;

  const recipients = Array.isArray(toEmails) && toEmails.length > 0
    ? toEmails
    : [senderEmail];

  const html = broadcastAnnouncementTemplate({
    senderName,
    subject,
    message,
    portalUrl,
  });

  return sendEmail({
    to: recipients,
    subject: `📢 [Red Cross KyU Broadcast] ${subject}`,
    htmlContent: html,
  });
}

export default {
  sendEmail,
  sendContactEmails,
  sendPasswordResetEmail,
  sendDirectMessageEmail,
  sendBroadcastEmail,
};
