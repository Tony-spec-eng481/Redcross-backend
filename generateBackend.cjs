const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/DELL/Desktop/redcross/backend';

const dirs = ['routes', 'controllers', 'middlewares', 'config'];
dirs.forEach(d => {
  const dirPath = path.join(baseDir, d);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
});

const files = {
  'config/supabase.js': `import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
`,
  'middlewares/authMiddleware.js': `// Middleware to verify user token/session
export const requireAuth = (req, res, next) => {
  // TODO: implement supabase JWT verification
  // const token = req.headers.authorization;
  next();
};

export const requireAdmin = (req, res, next) => {
  // TODO: implement admin role check
  next();
};
`,
  'controllers/authController.js': `import { supabase } from '../config/supabase.js';

export const register = async (req, res) => {
  const { name, email, phone, password } = req.body;
  // TODO: Supabase auth registration
  res.json({ success: true, message: 'User registered' });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  // TODO: Supabase auth login
  res.json({ success: true, token: 'mock-token' });
};
`,
  'controllers/profileController.js': `import { supabase } from '../config/supabase.js';

export const getProfile = async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0] || {});
};

export const updateProfile = async (req, res) => {
  const { data, error } = await supabase.from('users').update(req.body).eq('id', req.body.id);
  res.json({ success: true, data });
};

export const deleteProfile = async (req, res) => {
  res.json({ success: true, message: 'Profile deleted' });
};
`,
  'controllers/galleryController.js': `import { supabase } from '../config/supabase.js';

export const getGallery = async (req, res) => {
  const { data, error } = await supabase.from('gallery').select('*').eq('status', 'approved');
  res.json(data || []);
};

export const submitImage = async (req, res) => {
  const { url } = req.body;
  const { data, error } = await supabase.from('gallery').insert([{ image_url: url, status: 'pending' }]);
  res.json({ success: true, message: 'Submitted for review' });
};
`,
  'controllers/eventController.js': `import { supabase } from '../config/supabase.js';

export const getEvents = async (req, res) => {
  const { data, error } = await supabase.from('events').select('*');
  res.json(data || []);
};
`,
  'controllers/firstAidController.js': `import { supabase } from '../config/supabase.js';

export const getFirstAid = async (req, res) => {
  const { data, error } = await supabase.from('first_aid').select('*');
  res.json(data || []);
};

export const askQuestion = async (req, res) => {
  const { text } = req.body;
  await supabase.from('questions').insert([{ text }]);
  res.json({ success: true, message: 'Question asked' });
};
`,
  'controllers/messageController.js': `import { supabase } from '../config/supabase.js';

export const getMessages = async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
  res.json(data || []);
};

export const sendMessage = async (req, res) => {
  const { text } = req.body;
  const { data, error } = await supabase.from('messages').insert([{ text }]);
  res.json({ success: true, data });
};
`,
  'controllers/adminController.js': `import { supabase } from '../config/supabase.js';

export const getStats = async (req, res) => {
  res.json({ totalMembers: 0, activeEvents: 0, pendingImages: 0 });
};

export const getPendingGallery = async (req, res) => {
  const { data } = await supabase.from('gallery').select('*').eq('status', 'pending');
  res.json(data || []);
};

export const approveImage = async (req, res) => {
  await supabase.from('gallery').update({ status: 'approved' }).eq('id', req.params.id);
  res.json({ success: true });
};

export const rejectImage = async (req, res) => {
  await supabase.from('gallery').delete().eq('id', req.params.id);
  res.json({ success: true });
};

export const createEvent = async (req, res) => {
  const { data } = await supabase.from('events').insert([req.body]);
  res.json({ success: true, data });
};

export const deleteEvent = async (req, res) => {
  await supabase.from('events').delete().eq('id', req.params.id);
  res.json({ success: true });
};
`,
  'routes/authRoutes.js': `import express from 'express';
import { register, login } from '../controllers/authController.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;
`,
  'routes/profileRoutes.js': `import express from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/profileController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.use(requireAuth);
router.get('/', getProfile);
router.put('/', updateProfile);
router.delete('/', deleteProfile);

export default router;
`,
  'routes/galleryRoutes.js': `import express from 'express';
import { getGallery, submitImage } from '../controllers/galleryController.js';
const router = express.Router();

router.get('/', getGallery);
router.post('/', submitImage);

export default router;
`,
  'routes/eventRoutes.js': `import express from 'express';
import { getEvents } from '../controllers/eventController.js';
const router = express.Router();

router.get('/', getEvents);

export default router;
`,
  'routes/firstAidRoutes.js': `import express from 'express';
import { getFirstAid, askQuestion } from '../controllers/firstAidController.js';
const router = express.Router();

router.get('/', getFirstAid);
router.post('/questions', askQuestion);

export default router;
`,
  'routes/messageRoutes.js': `import express from 'express';
import { getMessages, sendMessage } from '../controllers/messageController.js';
const router = express.Router();

router.get('/:userId', getMessages);
router.post('/', sendMessage);

export default router;
`,
  'routes/adminRoutes.js': `import express from 'express';
import { getStats, getPendingGallery, approveImage, rejectImage, createEvent, deleteEvent } from '../controllers/adminController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.use(requireAdmin);
router.get('/stats', getStats);
router.get('/gallery/pending', getPendingGallery);
router.put('/gallery/:id/approve', approveImage);
router.delete('/gallery/:id', rejectImage);
router.post('/events', createEvent);
router.delete('/events/:id', deleteEvent);

export default router;
`,
  'index.js': `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import firstAidRoutes from './routes/firstAidRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Backend is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/firstaid', firstAidRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/notifications', (req, res) => {
  res.json([]);
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`
};

Object.entries(files).forEach(([file, content]) => {
  fs.writeFileSync(path.join(baseDir, file), content);
});

console.log('Backend refactored into controllers and routes.');
