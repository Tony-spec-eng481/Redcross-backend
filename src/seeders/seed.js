/**
 * Seed script — populates the database with default superadmins
 * and sample data matching the frontend.
 *
 * Run: npm run seed
 */
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.log('\n⚠️  Supabase URL is not configured yet in backend/.env.');
  console.log('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env to seed your database.');
  console.log('\nℹ️  Test credentials work immediately in code:');
  console.log('   Admin:  admin@gmail.com  / Admin1234');
  console.log('   Member: john@gmail.com   / John1234\n');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('\n🌱 Starting database seed...\n');

  // ── 1. Create default admins ──
  const adminPwdHash1 = await bcrypt.hash('Admin1234', 12);
  const adminPwdHash2 = await bcrypt.hash('Admin@123', 12);

  const adminsToSeed = [
    {
      name: 'Admin User',
      email: 'admin@gmail.com',
      password_hash: adminPwdHash1,
      phone: '+254 700 000 000',
      role: 'superadmin',
      is_active: true,
      notification_preferences: { email: true, push: true, approvals: true, messages: true },
    },
    {
      name: 'Super Admin',
      email: 'admin@kirinyaga.ac.ke',
      password_hash: adminPwdHash2,
      phone: '+254 700 000 001',
      role: 'superadmin',
      is_active: true,
      notification_preferences: { email: true, push: true, approvals: true, messages: true },
    },
  ];

  const { data: seededAdmins, error: adminErr } = await supabase
    .from('admins')
    .upsert(adminsToSeed, { onConflict: 'email' })
    .select();

  if (adminErr) {
    console.error('❌ Failed to create admin:', adminErr.message);
    process.exit(1);
  }

  console.log('✅ Admin accounts created:');
  console.log('   1. Email: admin@gmail.com     | Password: Admin1234');
  console.log('   2. Email: admin@kirinyaga.ac.ke | Password: Admin@123\n');

  const adminId = seededAdmins?.[0]?.id || 'admin-test-001';

  // ── 2. Seed Members ──
  const members = [
    { name: 'John Doe', email: 'john@gmail.com', phone: '+254 712 345 678', role: 'Member', status: 'active', joined: '2024-01-15T00:00:00Z', created_by: adminId },
    { name: 'Jane Wanjiku', email: 'jane@student.ku.ac.ke', phone: '+254 711 111 111', role: 'Volunteer', status: 'active', joined: '2024-03-15T00:00:00Z', created_by: adminId },
    { name: 'Peter Kamau', email: 'peter@student.ku.ac.ke', phone: '+254 722 222 222', role: 'First Aider', status: 'active', joined: '2024-02-10T00:00:00Z', created_by: adminId },
    { name: 'Mary Njeri', email: 'mary@student.ku.ac.ke', phone: '+254 733 333 333', role: 'Coordinator', status: 'active', joined: '2024-01-20T00:00:00Z', created_by: adminId },
    { name: 'Grace Akinyi', email: 'grace@student.ku.ac.ke', phone: '+254 755 555 555', role: 'Volunteer', status: 'active', joined: '2024-05-12T00:00:00Z', created_by: adminId },
  ];

  const { error: memErr } = await supabase.from('members').upsert(members, { onConflict: 'email' });
  console.log(memErr ? `❌ Members: ${memErr.message}` : `✅ ${members.length} members seeded`);

  // ── 3. Seed Events ──
  const events = [
    { title: 'Annual Blood Donation Drive', date: '2024-06-15', time: '09:00', location: 'University Hall', description: 'Join us to save lives through blood donation. Refreshments provided.', status: 'approved', submitted_by: adminId, approved_by: adminId, approved_at: new Date().toISOString() },
    { title: 'Basic First Aid Training Workshop', date: '2024-06-22', time: '14:00', location: 'Science Complex Lab 3', description: 'Hands-on training covering CPR, choking, fractures, and emergency response.', status: 'approved', submitted_by: adminId, approved_by: adminId, approved_at: new Date().toISOString() },
    { title: 'Community Disaster Preparedness Walk', date: '2024-07-05', time: '07:30', location: 'Main Gate', description: 'Awareness walk through Kerugoya town on emergency preparedness.', status: 'pending', submitted_by: adminId },
  ];

  const { error: evErr } = await supabase.from('events').insert(events);
  console.log(evErr ? `❌ Events: ${evErr.message}` : `✅ ${events.length} events seeded`);

  // ── 4. Seed Gallery ──
  const gallery = [
    { title: 'First Aid Training 2024', type: 'image', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800', status: 'approved', submitted_by: 'Jane Wanjiku' },
    { title: 'Blood Drive at Student Center', type: 'image', url: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', status: 'approved', submitted_by: 'Peter Kamau' },
    { title: 'Community Outreach Kerugoya', type: 'image', url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800', status: 'pending', submitted_by: 'Mary Njeri' },
  ];

  const { error: galErr } = await supabase.from('gallery').insert(gallery);
  console.log(galErr ? `❌ Gallery: ${galErr.message}` : `✅ ${gallery.length} gallery items seeded`);

  // ── 5. Seed First Aid Guides ──
  const firstAid = [
    { title: 'CPR (Cardiopulmonary Resuscitation)', content: '1. Check the scene for safety.\n2. Tap the person and shout to check responsiveness.\n3. Call 999 or your local emergency number.\n4. Place hands on center of chest and push hard and fast (100-120 bpm).\n5. Deliver rescue breaths if trained.', category: 'Critical Care', is_published: true, created_by: adminId },
    { title: 'Managing Severe Bleeding', content: '1. Apply direct pressure to the wound with a clean cloth.\n2. Maintain continuous pressure.\n3. If blood soaks through, add another cloth — do not remove the first.\n4. Elevate the injured area above the heart if possible.\n5. Seek immediate medical assistance.', category: 'Trauma', is_published: true, created_by: adminId },
    { title: 'Treating Burns and Scalds', content: '1. Cool the burn immediately under cold running water for at least 10 minutes.\n2. Do not use ice or iced water.\n3. Remove clothing/jewelry near the area before swelling begins (unless stuck to burn).\n4. Cover loosely with sterile dressing or clean plastic wrap.', category: 'Thermal Injuries', is_published: true, created_by: adminId },
  ];

  const { error: faErr } = await supabase.from('first_aid').insert(firstAid);
  console.log(faErr ? `❌ First Aid: ${faErr.message}` : `✅ ${firstAid.length} first aid guides seeded`);

  // ── 6. Seed Messages ──
  const messages = [
    { sender_id: adminId, sender_name: 'Super Admin', text: 'Welcome to all newly registered Red Cross Kirinyaga University volunteers!', is_broadcast: true, is_read: false },
    { sender_name: 'Jane Wanjiku', text: 'Inquiry regarding the upcoming first aid certification dates.', is_broadcast: false, is_read: true },
  ];

  const { error: msgErr } = await supabase.from('messages').insert(messages);
  console.log(msgErr ? `❌ Messages: ${msgErr.message}` : `✅ ${messages.length} messages seeded`);

  // ── 7. Seed Questions ──
  const questions = [
    { asked_by: 'New Volunteer', question: 'How can I register for CPR certification?', status: 'answered', answer: 'You can sign up directly during our monthly training sessions in Science Complex Lab 3.', answered_by: adminId, answered_at: new Date().toISOString() },
    { asked_by: 'Student Member', question: 'Are first aid kits provided for university hostel emergency captains?', status: 'unanswered' },
  ];

  const { error: qErr } = await supabase.from('questions').insert(questions);
  console.log(qErr ? `❌ Questions: ${qErr.message}` : `✅ ${questions.length} questions seeded`);

  // ── 8. Seed Notifications ──
  const notifications = [
    { recipient_id: adminId, type: 'event', text: 'New event submission: "Community Disaster Preparedness Walk"', link: 'events', is_read: false },
    { recipient_id: adminId, type: 'gallery', text: 'New photo uploaded by Mary Njeri awaiting approval', link: 'gallery', is_read: false },
    { recipient_id: adminId, type: 'question', text: 'New question asked by Student Member', link: 'questions', is_read: false },
  ];

  const { error: notifErr } = await supabase.from('notifications').insert(notifications);
  console.log(notifErr ? `❌ Notifications: ${notifErr.message}` : `✅ ${notifications.length} notifications seeded`);

  console.log('\n🎉 Seed completed successfully!\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
