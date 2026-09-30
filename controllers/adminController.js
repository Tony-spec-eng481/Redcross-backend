import { supabase } from '../config/supabase.js';
import { sendSuccess, sendError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';

// ═══════════════════════════════════════════════════════════
// IN-MEMORY TEST DATA STORE (Fallback if Supabase is unconfigured)
// ═══════════════════════════════════════════════════════════
let mockMembers = [
  { id: 'mem-1', name: 'John Doe', email: 'john@gmail.com', phone: '+254 712 345 678', role: 'Member', status: 'active', joined: '2024-01-15T00:00:00Z', created_at: '2024-01-15T00:00:00Z' },
  { id: 'mem-2', name: 'Jane Wanjiku', email: 'jane@student.ku.ac.ke', phone: '+254 711 111 111', role: 'Volunteer', status: 'active', joined: '2024-03-15T00:00:00Z', created_at: '2024-03-15T00:00:00Z' },
  { id: 'mem-3', name: 'Peter Kamau', email: 'peter@student.ku.ac.ke', phone: '+254 722 222 222', role: 'First Aider', status: 'active', joined: '2024-02-10T00:00:00Z', created_at: '2024-02-10T00:00:00Z' },
  { id: 'mem-4', name: 'Mary Njeri', email: 'mary@student.ku.ac.ke', phone: '+254 733 333 333', role: 'Coordinator', status: 'active', joined: '2024-01-20T00:00:00Z', created_at: '2024-01-20T00:00:00Z' },
  { id: 'mem-5', name: 'Grace Akinyi', email: 'grace@student.ku.ac.ke', phone: '+254 755 555 555', role: 'Volunteer', status: 'active', joined: '2024-05-12T00:00:00Z', created_at: '2024-05-12T00:00:00Z' },
];

let mockEvents = [
  { id: 'ev-1', title: 'Annual Blood Donation Drive', date: '2024-06-15', time: '09:00', location: 'University Hall', description: 'Join us to save lives through blood donation. Refreshments provided.', status: 'approved', created_at: '2024-05-01T00:00:00Z' },
  { id: 'ev-2', title: 'Basic First Aid Training Workshop', date: '2024-06-22', time: '14:00', location: 'Science Complex Lab 3', description: 'Hands-on training covering CPR, choking, fractures, and emergency response.', status: 'approved', created_at: '2024-05-10T00:00:00Z' },
  { id: 'ev-3', title: 'Community Disaster Preparedness Walk', date: '2024-07-05', time: '07:30', location: 'Main Gate', description: 'Awareness walk through Kerugoya town on emergency preparedness.', status: 'pending', created_at: '2024-05-20T00:00:00Z' },
];

let mockGallery = [
  { id: 'gal-1', title: 'First Aid Training 2024', type: 'image', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800', status: 'approved', submitted_by: 'Jane Wanjiku', created_at: '2024-05-01T00:00:00Z' },
  { id: 'gal-2', title: 'Blood Drive at Student Center', type: 'image', url: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', status: 'approved', submitted_by: 'Peter Kamau', created_at: '2024-05-02T00:00:00Z' },
  { id: 'gal-3', title: 'Community Outreach Kerugoya', type: 'image', url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800', status: 'pending', submitted_by: 'Mary Njeri', created_at: '2024-05-03T00:00:00Z' },
];

let mockFirstAid = [
  { id: 'fa-1', title: 'CPR (Cardiopulmonary Resuscitation)', content: '1. Check the scene for safety.\n2. Tap the person and shout to check responsiveness.\n3. Call 999 or your local emergency number.\n4. Place hands on center of chest and push hard and fast (100-120 bpm).\n5. Deliver rescue breaths if trained.', category: 'Critical Care', is_published: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'fa-2', title: 'Managing Severe Bleeding', content: '1. Apply direct pressure to the wound with a clean cloth.\n2. Maintain continuous pressure.\n3. If blood soaks through, add another cloth — do not remove the first.\n4. Elevate the injured area above the heart if possible.\n5. Seek immediate medical assistance.', category: 'Trauma', is_published: true, created_at: '2024-01-02T00:00:00Z' },
  { id: 'fa-3', title: 'Treating Burns and Scalds', content: '1. Cool the burn immediately under cold running water for at least 10 minutes.\n2. Do not use ice or iced water.\n3. Remove clothing/jewelry near the area before swelling begins (unless stuck to burn).\n4. Cover loosely with sterile dressing or clean plastic wrap.', category: 'Thermal Injuries', is_published: true, created_at: '2024-01-03T00:00:00Z' },
];

let mockMessages = [
  { id: 'msg-1', sender_id: 'admin-test-001', sender_name: 'Super Admin', text: 'Welcome to all newly registered Red Cross Kirinyaga University volunteers!', is_broadcast: true, is_read: false, created_at: '2024-05-01T00:00:00Z' },
  { id: 'msg-2', sender_id: 'mem-1', sender_name: 'John Doe', text: 'Inquiry regarding the upcoming first aid certification dates.', is_broadcast: false, is_read: false, created_at: '2024-05-02T00:00:00Z' },
];

let mockQuestions = [
  { id: 'q-1', asked_by: 'New Volunteer', question: 'How can I register for CPR certification?', status: 'answered', answer: 'You can sign up directly during our monthly training sessions in Science Complex Lab 3.', created_at: '2024-05-01T00:00:00Z' },
  { id: 'q-2', asked_by: 'Student Member', question: 'Are first aid kits provided for university hostel emergency captains?', status: 'unanswered', answer: null, created_at: '2024-05-02T00:00:00Z' },
];

let mockNotifications = [
  { id: 'notif-1', recipient_id: 'admin-test-001', type: 'event', text: 'New event submission: "Community Disaster Preparedness Walk"', link: 'events', is_read: false, created_at: new Date().toISOString() },
  { id: 'notif-2', recipient_id: 'admin-test-001', type: 'gallery', text: 'New photo uploaded by Mary Njeri awaiting approval', link: 'gallery', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'notif-3', recipient_id: 'admin-test-001', type: 'question', text: 'New question asked by Student Member', link: 'questions', is_read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
];

// Helper to check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = process.env.SUPABASE_URL;
  return url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('placeholder.supabase.co');
};

// ═══════════════════════════════════════════════════════════
// STATS / DASHBOARD
// ═══════════════════════════════════════════════════════════

export const getStats = asyncHandler(async (req, res) => {
  if (!isSupabaseConfigured()) {
    return sendSuccess(res, 'Dashboard stats fetched.', {
      totalMembers: mockMembers.length,
      activeEvents: mockEvents.filter(e => e.status === 'approved').length,
      pendingImages: mockGallery.filter(g => g.status === 'pending').length,
      totalMessages: mockMessages.length,
      pendingEvents: mockEvents.filter(e => e.status === 'pending').length,
      unansweredQuestions: mockQuestions.filter(q => q.status === 'unanswered').length,
    });
  }

  try {
    const [members, events, pendingGallery, messages, pendingEvents, questions] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('gallery').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'unanswered'),
    ]);

    return sendSuccess(res, 'Dashboard stats fetched.', {
      totalMembers: members.count ?? mockMembers.length,
      activeEvents: events.count ?? mockEvents.filter(e => e.status === 'approved').length,
      pendingImages: pendingGallery.count ?? mockGallery.filter(g => g.status === 'pending').length,
      totalMessages: messages.count ?? mockMessages.length,
      pendingEvents: pendingEvents.count ?? mockEvents.filter(e => e.status === 'pending').length,
      unansweredQuestions: questions.count ?? mockQuestions.filter(q => q.status === 'unanswered').length,
    });
  } catch {
    return sendSuccess(res, 'Dashboard stats fetched.', {
      totalMembers: mockMembers.length,
      activeEvents: mockEvents.filter(e => e.status === 'approved').length,
      pendingImages: mockGallery.filter(g => g.status === 'pending').length,
      totalMessages: mockMessages.length,
      pendingEvents: mockEvents.filter(e => e.status === 'pending').length,
      unansweredQuestions: mockQuestions.filter(q => q.status === 'unanswered').length,
    });
  }
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = [
    ...mockEvents.map(e => ({ type: 'event', text: `Event "${e.title}" ${e.status}`, time: e.created_at })),
    ...mockMembers.map(m => ({ type: 'member', text: `${m.name} joined as member`, time: m.joined })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

  return sendSuccess(res, 'Activity feed fetched.', activity);
});

// ═══════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════

export const getMembers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let list = [...mockMembers];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }
  return sendSuccess(res, 'Members fetched.', list);
});

export const getMember = asyncHandler(async (req, res) => {
  const member = mockMembers.find(m => m.id === req.params.id);
  if (!member) return sendError(res, 'Member not found.', 404);
  return sendSuccess(res, 'Member fetched.', member);
});

export const createMember = asyncHandler(async (req, res) => {
  const { name, email, phone, role, status, notes } = req.body;
  if (!name || !email) return sendError(res, 'Name and email are required.', 400);

  const newMember = {
    id: `mem-${Date.now()}`,
    name,
    email: email.toLowerCase().trim(),
    phone: phone || '',
    role: role || 'Member',
    status: status || 'active',
    notes: notes || '',
    joined: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  mockMembers.unshift(newMember);
  return sendSuccess(res, 'Member created.', newMember, 201);
});

export const updateMember = asyncHandler(async (req, res) => {
  const index = mockMembers.findIndex(m => m.id === req.params.id);
  if (index === -1) return sendError(res, 'Member not found.', 404);

  mockMembers[index] = { ...mockMembers[index], ...req.body };
  return sendSuccess(res, 'Member updated.', mockMembers[index]);
});

export const updateMemberStatus = asyncHandler(async (req, res) => {
  const index = mockMembers.findIndex(m => m.id === req.params.id);
  if (index === -1) return sendError(res, 'Member not found.', 404);

  mockMembers[index].status = req.body.status || (mockMembers[index].status === 'active' ? 'inactive' : 'active');
  return sendSuccess(res, 'Member status updated.', mockMembers[index]);
});

export const deleteMember = asyncHandler(async (req, res) => {
  mockMembers = mockMembers.filter(m => m.id !== req.params.id);
  return sendSuccess(res, 'Member deleted.');
});

// ═══════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════

export const getEvents = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Events fetched.', mockEvents);
});

export const getEvent = asyncHandler(async (req, res) => {
  const ev = mockEvents.find(e => e.id === req.params.id);
  if (!ev) return sendError(res, 'Event not found.', 404);
  return sendSuccess(res, 'Event fetched.', ev);
});

export const createEvent = asyncHandler(async (req, res) => {
  const { title, date, time, location, description, image_url } = req.body;
  if (!title) return sendError(res, 'Title is required.', 400);

  const newEvent = {
    id: `ev-${Date.now()}`,
    title,
    date: date || '',
    time: time || '09:00',
    location: location || '',
    description: description || '',
    image_url: image_url || '',
    status: 'approved',
    created_at: new Date().toISOString(),
  };
  mockEvents.unshift(newEvent);
  return sendSuccess(res, 'Event created.', newEvent, 201);
});

export const updateEvent = asyncHandler(async (req, res) => {
  const index = mockEvents.findIndex(e => e.id === req.params.id);
  if (index === -1) return sendError(res, 'Event not found.', 404);

  mockEvents[index] = { ...mockEvents[index], ...req.body };
  return sendSuccess(res, 'Event updated.', mockEvents[index]);
});

export const approveEvent = asyncHandler(async (req, res) => {
  const index = mockEvents.findIndex(e => e.id === req.params.id);
  if (index === -1) return sendError(res, 'Event not found.', 404);

  mockEvents[index].status = 'approved';
  return sendSuccess(res, 'Event approved.', mockEvents[index]);
});

export const rejectEvent = asyncHandler(async (req, res) => {
  const index = mockEvents.findIndex(e => e.id === req.params.id);
  if (index === -1) return sendError(res, 'Event not found.', 404);

  mockEvents[index].status = 'rejected';
  mockEvents[index].rejection_reason = req.body.reason || '';
  return sendSuccess(res, 'Event rejected.', mockEvents[index]);
});

export const deleteEvent = asyncHandler(async (req, res) => {
  mockEvents = mockEvents.filter(e => e.id !== req.params.id);
  return sendSuccess(res, 'Event deleted.');
});

// ═══════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════

export const getGallery = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Gallery fetched.', mockGallery);
});

export const createGalleryItem = asyncHandler(async (req, res) => {
  const { title, url, type } = req.body;
  const item = {
    id: `gal-${Date.now()}`,
    title: title || 'New Photo',
    url: url || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    type: type || 'image',
    status: 'approved',
    submitted_by: 'Admin',
    created_at: new Date().toISOString(),
  };
  mockGallery.unshift(item);
  return sendSuccess(res, 'Gallery item uploaded.', item, 201);
});

export const approveGalleryItem = asyncHandler(async (req, res) => {
  const index = mockGallery.findIndex(g => g.id === req.params.id);
  if (index === -1) return sendError(res, 'Gallery item not found.', 404);

  mockGallery[index].status = 'approved';
  return sendSuccess(res, 'Gallery item approved.', mockGallery[index]);
});

export const rejectGalleryItem = asyncHandler(async (req, res) => {
  const index = mockGallery.findIndex(g => g.id === req.params.id);
  if (index === -1) return sendError(res, 'Gallery item not found.', 404);

  mockGallery[index].status = 'rejected';
  mockGallery[index].rejection_reason = req.body.reason || '';
  return sendSuccess(res, 'Gallery item rejected.', mockGallery[index]);
});

export const deleteGalleryItem = asyncHandler(async (req, res) => {
  mockGallery = mockGallery.filter(g => g.id !== req.params.id);
  return sendSuccess(res, 'Gallery item deleted.');
});

// ═══════════════════════════════════════════════════════════
// FIRST AID
// ═══════════════════════════════════════════════════════════

export const getFirstAid = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'First aid guides fetched.', mockFirstAid);
});

export const getFirstAidItem = asyncHandler(async (req, res) => {
  const item = mockFirstAid.find(f => f.id === req.params.id);
  if (!item) return sendError(res, 'Guide not found.', 404);
  return sendSuccess(res, 'Guide fetched.', item);
});

export const createFirstAid = asyncHandler(async (req, res) => {
  const { title, content, category, video_url, image_url } = req.body;
  if (!title) return sendError(res, 'Title is required.', 400);

  const item = {
    id: `fa-${Date.now()}`,
    title,
    content: content || '',
    category: category || 'General',
    video_url: video_url || '',
    image_url: image_url || '',
    is_published: true,
    created_at: new Date().toISOString(),
  };
  mockFirstAid.unshift(item);
  return sendSuccess(res, 'First aid guide created.', item, 201);
});

export const updateFirstAid = asyncHandler(async (req, res) => {
  const index = mockFirstAid.findIndex(f => f.id === req.params.id);
  if (index === -1) return sendError(res, 'Guide not found.', 404);

  mockFirstAid[index] = { ...mockFirstAid[index], ...req.body };
  return sendSuccess(res, 'Guide updated.', mockFirstAid[index]);
});

export const deleteFirstAid = asyncHandler(async (req, res) => {
  mockFirstAid = mockFirstAid.filter(f => f.id !== req.params.id);
  return sendSuccess(res, 'Guide deleted.');
});

// ═══════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════

export const getMessages = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Messages fetched.', mockMessages);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { text, subject, is_broadcast } = req.body;
  if (!text) return sendError(res, 'Message text is required.', 400);

  const message = {
    id: `msg-${Date.now()}`,
    sender_id: req.admin?.id || 'admin-test-001',
    sender_name: req.admin?.name || 'Admin',
    subject: subject || '',
    text,
    is_broadcast: is_broadcast !== undefined ? is_broadcast : true,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  mockMessages.unshift(message);
  return sendSuccess(res, 'Message sent.', message, 201);
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const msg = mockMessages.find(m => m.id === req.params.id);
  if (msg) msg.is_read = true;
  return sendSuccess(res, 'Message marked as read.', msg);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  mockMessages = mockMessages.filter(m => m.id !== req.params.id);
  return sendSuccess(res, 'Message deleted.');
});

// ═══════════════════════════════════════════════════════════
// QUESTIONS
// ═══════════════════════════════════════════════════════════

export const getQuestions = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Questions fetched.', mockQuestions);
});

export const getQuestion = asyncHandler(async (req, res) => {
  const q = mockQuestions.find(i => i.id === req.params.id);
  if (!q) return sendError(res, 'Question not found.', 404);
  return sendSuccess(res, 'Question fetched.', q);
});

export const createQuestion = asyncHandler(async (req, res) => {
  const { question, asked_by } = req.body;
  if (!question) return sendError(res, 'Question text is required.', 400);

  const q = {
    id: `q-${Date.now()}`,
    asked_by: asked_by || 'Member',
    question,
    status: 'unanswered',
    answer: null,
    created_at: new Date().toISOString(),
  };
  mockQuestions.unshift(q);
  return sendSuccess(res, 'Question submitted.', q, 201);
});

export const answerQuestion = asyncHandler(async (req, res) => {
  const q = mockQuestions.find(i => i.id === req.params.id);
  if (!q) return sendError(res, 'Question not found.', 404);

  q.answer = req.body.answer || '';
  q.status = 'answered';
  q.answered_at = new Date().toISOString();
  return sendSuccess(res, 'Question answered.', q);
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  mockQuestions = mockQuestions.filter(q => q.id !== req.params.id);
  return sendSuccess(res, 'Question deleted.');
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export const getNotifications = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Notifications fetched.', mockNotifications);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = mockNotifications.filter(n => !n.is_read).length;
  return sendSuccess(res, 'Unread count fetched.', { count });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notif = mockNotifications.find(n => n.id === req.params.id);
  if (notif) notif.is_read = true;
  return sendSuccess(res, 'Notification marked as read.', notif);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  mockNotifications.forEach(n => { n.is_read = true; });
  return sendSuccess(res, 'All notifications marked as read.');
});

export const deleteNotification = asyncHandler(async (req, res) => {
  mockNotifications = mockNotifications.filter(n => n.id !== req.params.id);
  return sendSuccess(res, 'Notification deleted.');
});
