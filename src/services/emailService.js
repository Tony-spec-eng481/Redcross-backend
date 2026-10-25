import dotenv from 'dotenv';
import { supabase } from '../../config/supabase.js';
import {
  contactFormAdminTemplate,
  contactFormUserConfirmationTemplate,
  passwordResetTemplate,
  directMessageNotificationTemplate,
  broadcastAnnouncementTemplate,
  memberWelcomeTemplate,
  firstAidAnnouncementTemplate,
  firstAidQuestionNotificationTemplate,
  disseminationAnnouncementTemplate,
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
    '';

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

/**
 * High-level helper: Send Welcome email to newly registered member with default password
 */
export async function sendMemberWelcomeEmail({
  email,
  name = 'Valued Member',
  defaultPassword = 'Redcross',
  role = 'Member',
}) {
  if (!email) return { success: false, error: 'Recipient email is missing' };

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const loginUrl = `${clientUrl}/login`;
  const profileUrl = `${clientUrl}/portal/profile`;

  const html = memberWelcomeTemplate({
    name,
    email,
    defaultPassword,
    role,
    loginUrl,
    profileUrl,
  });

  return sendEmail({
    to: email,
    subject: `🎉 Welcome to Kenya Red Cross KyU Chapter — Your Account & Access Guide`,
    htmlContent: html,
  });
}

/**
 * High-level helper: Send First Aid announcement email to all active members
 */
export async function sendFirstAidAnnouncementEmail({
  firstAid,
  customEmails = null,
}) {
  if (!firstAid || !firstAid.title) {
    return { success: false, error: 'First Aid details are missing' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const portalUrl = `${clientUrl}/portal/firstaid?id=${firstAid.id}`;

  let recipientList = [];

  if (Array.isArray(customEmails) && customEmails.length > 0) {
    recipientList = customEmails.map(e => (typeof e === 'string' ? { email: e } : e));
  } else {
    // Fetch all active members from database
    const { data: members, error } = await supabase
      .from('members')
      .select('email, name')
      .in('status', ['active', 'approved'])
      .not('email', 'is', null);

    if (error) {
      console.warn('⚠️ Could not fetch member emails for first aid announcement:', error.message);
    }

    if (members && members.length > 0) {
      recipientList = members
        .filter(m => m.email && m.email.includes('@'))
        .map(m => ({ email: m.email, name: m.name || 'Member' }));
    }
  }

  if (recipientList.length === 0) {
    const { senderEmail } = getBrevoConfig();
    if (senderEmail) {
      recipientList = [{ email: senderEmail, name: 'Red Cross KyU Chapter' }];
    } else {
      return { success: false, error: 'No member recipients found to send announcement to.' };
    }
  }

  const html = firstAidAnnouncementTemplate({
    title: firstAid.title,
    category: firstAid.category || 'Emergency Care',
    content: firstAid.content || '',
    imageUrl: firstAid.image_url || '',
    videoUrl: firstAid.video_url || '',
    mediaType: firstAid.media_type || (firstAid.video_url ? 'video' : 'image'),
    submittedByName: firstAid.submitted_by_name || '',
    portalUrl,
  });

  // Batch into chunks of 45 if list is large to respect email provider limits
  const CHUNK_SIZE = 45;
  const results = [];

  for (let i = 0; i < recipientList.length; i += CHUNK_SIZE) {
    const chunk = recipientList.slice(i, i + CHUNK_SIZE);
    try {
      const res = await sendEmail({
        to: chunk,
        subject: `🚨 [First Aid Update] ${firstAid.title} — Red Cross KyU`,
        htmlContent: html,
      });
      results.push(res);
    } catch (err) {
      console.error('Error sending first aid email chunk:', err);
    }
  }

  return {
    success: true,
    totalRecipients: recipientList.length,
    results,
    portalUrl,
  };
}

/**
 * High-level helper: Send Q&A Question notification email to all active members and admins
 */
export async function sendQuestionNotificationEmail({
  question,
  customEmails = null,
}) {
  if (!question || (!question.question && !question.title)) {
    return { success: false, error: 'Question details are missing' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const qnaUrl = `${clientUrl}/portal/firstaid?tab=ask&qid=${question.id}`;

  let recipientList = [];

  if (Array.isArray(customEmails) && customEmails.length > 0) {
    recipientList = customEmails.map(e => (typeof e === 'string' ? { email: e } : e));
  } else {
    // 1. Fetch active members
    const { data: members } = await supabase
      .from('members')
      .select('email, name')
      .in('status', ['active', 'approved'])
      .not('email', 'is', null);

    // 2. Fetch admins
    const { data: admins } = await supabase
      .from('admins')
      .select('email, name')
      .eq('is_active', true)
      .not('email', 'is', null);

    const emailMap = new Map();

    (members || []).forEach(m => {
      if (m.email && m.email.includes('@')) {
        emailMap.set(m.email.toLowerCase(), { email: m.email, name: m.name || 'Member' });
      }
    });

    (admins || []).forEach(a => {
      if (a.email && a.email.includes('@')) {
        emailMap.set(a.email.toLowerCase(), { email: a.email, name: a.name || 'Admin' });
      }
    });

    recipientList = Array.from(emailMap.values());
  }

  if (recipientList.length === 0) {
    const { senderEmail } = getBrevoConfig();
    if (senderEmail) {
      recipientList = [{ email: senderEmail, name: 'Red Cross Community' }];
    } else {
      return { success: false, error: 'No recipients found.' };
    }
  }

  const title = question.title || (question.question.length > 60 ? `${question.question.slice(0, 60)}...` : question.question);

  const html = firstAidQuestionNotificationTemplate({
    title,
    questionText: question.question || '',
    askedByName: question.asked_by || 'A Member',
    category: question.category || 'First Aid & Emergency Care',
    qnaUrl,
  });

  const CHUNK_SIZE = 45;
  const results = [];

  for (let i = 0; i < recipientList.length; i += CHUNK_SIZE) {
    const chunk = recipientList.slice(i, i + CHUNK_SIZE);
    try {
      const res = await sendEmail({
        to: chunk,
        subject: `❓ [Red Cross Q&A] New Question: ${title}`,
        htmlContent: html,
      });
      results.push(res);
    } catch (err) {
      console.error('Error sending question email chunk:', err);
    }
  }

  return {
    success: true,
    totalRecipients: recipientList.length,
    results,
    qnaUrl,
  };
}

/**
 * High-level helper: Send Dissemination announcement email to all active members & admins
 */
export async function sendDisseminationAnnouncementEmail({
  dissemination,
  customEmails = null,
}) {
  if (!dissemination || !dissemination.title) {
    return { success: false, error: 'Dissemination details are missing' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const portalUrl = `${clientUrl}/portal/dissemination?id=${dissemination.id}`;

  let recipientList = [];

  if (Array.isArray(customEmails) && customEmails.length > 0) {
    recipientList = customEmails.map(e => (typeof e === 'string' ? { email: e } : e));
  } else {
    // 1. Fetch active/approved members from database
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('email, name')
      .in('status', ['active', 'approved'])
      .not('email', 'is', null);

    if (memErr) {
      console.warn('⚠️ Could not fetch member emails for dissemination announcement:', memErr.message);
    }

    // 2. Fetch admins
    const { data: admins } = await supabase
      .from('admins')
      .select('email, name')
      .eq('is_active', true)
      .not('email', 'is', null);

    const emailMap = new Map();

    (members || []).forEach(m => {
      if (m.email && m.email.includes('@')) {
        emailMap.set(m.email.toLowerCase(), { email: m.email, name: m.name || 'Member' });
      }
    });

    (admins || []).forEach(a => {
      if (a.email && a.email.includes('@')) {
        emailMap.set(a.email.toLowerCase(), { email: a.email, name: a.name || 'Admin' });
      }
    });

    recipientList = Array.from(emailMap.values());
  }

  if (recipientList.length === 0) {
    const { senderEmail } = getBrevoConfig();
    if (senderEmail) {
      recipientList = [{ email: senderEmail, name: 'Red Cross KyU Chapter' }];
    } else {
      return { success: false, error: 'No member recipients found to send dissemination announcement to.' };
    }
  }

  const excerpt = dissemination.content
    ? (dissemination.content.length > 320 ? `${dissemination.content.slice(0, 320)}...` : dissemination.content)
    : dissemination.description || '';

  const html = disseminationAnnouncementTemplate({
    title: dissemination.title,
    category: dissemination.category || 'Fundamental Principles',
    description: dissemination.description || '',
    contentExcerpt: excerpt,
    imageUrl: dissemination.image_url || '',
    videoUrl: dissemination.video_url || '',
    documentUrl: dissemination.document_url || dissemination.pdf_url || '',
    tags: Array.isArray(dissemination.tags) ? dissemination.tags : [],
    portalUrl,
  });

  // Batch into chunks of 45 to respect Brevo limit
  const CHUNK_SIZE = 45;
  const results = [];

  for (let i = 0; i < recipientList.length; i += CHUNK_SIZE) {
    const chunk = recipientList.slice(i, i + CHUNK_SIZE);
    try {
      const res = await sendEmail({
        to: chunk,
        subject: `🌐 [Red Cross Dissemination] ${dissemination.title} (${dissemination.category || 'Principles'})`,
        htmlContent: html,
      });
      results.push(res);
    } catch (err) {
      console.error('Error sending dissemination email chunk:', err);
    }
  }

  return {
    success: true,
    totalRecipients: recipientList.length,
    results,
    portalUrl,
  };
}

export default {
  sendEmail,
  sendContactEmails,
  sendPasswordResetEmail,
  sendDirectMessageEmail,
  sendBroadcastEmail,
  sendMemberWelcomeEmail,
  sendFirstAidAnnouncementEmail,
  sendQuestionNotificationEmail,
  sendDisseminationAnnouncementEmail,
};
