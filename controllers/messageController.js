import { supabase } from '../config/supabase.js';
import {
  sendContactEmails,
  sendDirectMessageEmail,
  sendBroadcastEmail,
} from '../src/services/emailService.js';
import { sendSuccess, sendError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';

const SUBJECT_MAP = {
  join: 'I want to join the chapter',
  volunteer: 'Volunteer opportunity',
  partnership: 'Partnership inquiry',
  question: 'General question',
};

/**
 * Helper to extract email from a sender string like "John Doe (john@example.com)"
 */
function extractEmail(str) {
  if (!str) return null;
  const match = str.match(/\(([^)]+)\)/);
  if (match && match[1].includes('@')) return match[1].trim();
  const directMatch = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (directMatch) return directMatch[0].trim();
  return null;
}

/**
 * GET /api/v1/messages/users (or /api/messages/users)
 * Fetch directory of members and admins to chat with
 */
export const getDirectoryUsers = asyncHandler(async (req, res) => {
  // Fetch admins
  const { data: admins } = await supabase
    .from('admins')
    .select('id, name, email, role, avatar, phone')
    .eq('is_active', true);

  // Fetch members
  const { data: members } = await supabase
    .from('members')
    .select('id, name, email, role, avatar, phone, status')
    .in('status', ['active', 'approved']);

  const formattedAdmins = (admins || []).map(a => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role === 'superadmin' ? 'Super Administrator' : 'Administrator',
    avatar: a.avatar,
    phone: a.phone,
    type: 'admin',
  }));

  const formattedMembers = (members || []).map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role || 'Member',
    avatar: m.avatar,
    phone: m.phone,
    type: 'member',
  }));

  const combined = [...formattedAdmins, ...formattedMembers];
  return sendSuccess(res, 'Directory users fetched.', combined);
});

/**
 * POST /api/v1/messages/contact (or /api/messages/contact)
 * Public endpoint used by the frontend Contact Us form
 */
export const submitContactForm = asyncHandler(async (req, res) => {
  const { firstName, lastName, name, email, phone, subject, message, text } = req.body;

  const msgContent = (message || text || '').trim();
  const contactEmail = (email || '').trim().toLowerCase();

  if (!contactEmail) {
    return sendError(res, 'Email address is required.', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) {
    return sendError(res, 'Please provide a valid email address.', 400);
  }

  if (!msgContent) {
    return sendError(res, 'Message content cannot be empty.', 400);
  }

  const fullName = (firstName || lastName)
    ? `${firstName || ''} ${lastName || ''}`.trim()
    : (name || 'Website Visitor').trim();

  const formattedSubject = SUBJECT_MAP[subject] || subject || 'General Inquiry';

  // 1. Save contact message into Supabase 'messages' table for Admin Portal
  const messageData = {
    sender_name: `${fullName} (${contactEmail})`,
    sender_email: contactEmail,
    subject: formattedSubject,
    text: phone ? `Phone: ${phone}\nEmail: ${contactEmail}\n\n${msgContent}` : `Email: ${contactEmail}\n\n${msgContent}`,
    is_broadcast: false,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data: savedMessage, error: msgError } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();

  if (msgError) {
    console.error('Failed to save contact message to DB:', msgError);
  }

  // 2. Insert notification for Admin Portal notification stream
  try {
    await supabase.from('notifications').insert([{
      type: 'message',
      text: `New contact inquiry from ${fullName}: "${formattedSubject}"`,
      link: '/messages',
      is_read: false,
      created_at: new Date().toISOString(),
    }]);
  } catch (notifErr) {
    console.error('Failed to create admin notification:', notifErr);
  }

  // 3. Dispatch emails via Brevo
  sendContactEmails({
    firstName: firstName || fullName.split(' ')[0] || 'Visitor',
    lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
    email: contactEmail,
    phone,
    subject: formattedSubject,
    message: msgContent,
  }).catch((emailErr) => {
    console.error('Background Brevo contact email failed:', emailErr);
  });

  return sendSuccess(
    res,
    'Thank you for reaching out! Your message has been sent to the admin portal and chapter email.',
    savedMessage || messageData,
    201
  );
});

/**
 * GET /api/v1/messages
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return sendError(res, 'Failed to retrieve messages: ' + error.message, 500);
  }
  return res.json(data || []);
});

/**
 * POST /api/v1/messages
 * Send message / reply / broadcast & dispatch Brevo notification email
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const {
    text,
    subject,
    sender_name,
    sender_email,
    receiver_id,
    receiver_name,
    receiver_email,
    is_broadcast,
    reply_to_id,
  } = req.body;

  if (!text || !text.trim()) {
    return sendError(res, 'Message text is required.', 400);
  }

  const sName = sender_name || req.admin?.name || 'Red Cross Chapter User';
  const sEmail = sender_email || req.admin?.email || 'redcross@kyu.ac.ke';
  const isBroadcast = is_broadcast === true || is_broadcast === 'true';

  let targetReceiverEmail = receiver_email;
  let targetReceiverName = receiver_name;

  // If replying to a specific inquiry/message and receiver_email not given, lookup original message
  if (reply_to_id && !targetReceiverEmail) {
    try {
      const { data: origMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('id', reply_to_id)
        .single();

      if (origMsg) {
        targetReceiverEmail = origMsg.sender_email || extractEmail(origMsg.sender_name) || extractEmail(origMsg.text);
        targetReceiverName = targetReceiverName || origMsg.sender_name?.replace(/\([^)]*\)/g, '').trim();
      }
    } catch (lookupErr) {
      console.error('Error looking up original message:', lookupErr);
    }
  }

  const newMsg = {
    sender_id: req.admin?.id || null,
    sender_name: sName,
    sender_email: sEmail,
    receiver_id: receiver_id || null,
    receiver_name: targetReceiverName || null,
    receiver_email: targetReceiverEmail || null,
    subject: subject || (reply_to_id ? 'Re: Message' : isBroadcast ? 'Broadcast Announcement' : 'Direct Message'),
    text: text.trim(),
    is_broadcast: isBroadcast,
    reply_to_id: reply_to_id || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('messages')
    .insert([newMsg])
    .select()
    .single();

  if (error) {
    return sendError(res, 'Failed to save message: ' + error.message, 400);
  }

  // Insert notification for recipient or system
  try {
    if (!isBroadcast && targetReceiverName) {
      await supabase.from('notifications').insert([{
        type: 'message',
        text: `New message from ${sName}: "${(newMsg.subject || '').slice(0, 50)}"`,
        link: '/messages',
        is_read: false,
        created_at: new Date().toISOString(),
      }]);
    }
  } catch (nErr) {
    console.error('Notification insert failed:', nErr);
  }

  // 📧 Send Brevo email in background
  if (isBroadcast) {
    sendBroadcastEmail({
      subject: newMsg.subject,
      message: newMsg.text,
      senderName: sName,
    }).catch(e => console.error('Broadcast email error:', e));
  } else if (targetReceiverEmail) {
    sendDirectMessageEmail({
      toEmail: targetReceiverEmail,
      receiverName: targetReceiverName || 'Member',
      senderName: sName,
      senderEmail: sEmail,
      subject: newMsg.subject,
      message: newMsg.text,
    }).catch(e => console.error('Direct message email error:', e));
  }

  return res.json({
    success: true,
    message: isBroadcast
      ? 'Broadcast dispatched via portal and email.'
      : targetReceiverEmail
      ? `Message sent to ${targetReceiverName || 'recipient'} and notification email dispatched to ${targetReceiverEmail}.`
      : 'Message sent successfully.',
    data,
  });
});
