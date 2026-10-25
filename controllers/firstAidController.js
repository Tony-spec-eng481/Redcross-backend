import { supabase } from '../config/supabase.js';
import { sendQuestionNotificationEmail } from '../src/services/emailService.js';

/**
 * GET /api/v1/firstaid
 * Fetch all approved / published first aid guides for members & public portal
 */
export const getFirstAid = async (req, res) => {
  const { category, search } = req.query;

  let query = supabase
    .from('first_aid')
    .select('*')
    .or('status.eq.approved,status.is.null')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (category && category !== 'all' && category !== 'All') {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.json({ success: true, data: data || [] });
};

/**
 * GET /api/v1/firstaid/:id
 * Fetch a single first aid guide by ID
 */
export const getSingleFirstAid = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('first_aid')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, error: 'First aid guide not found.' });
  }

  return res.json({ success: true, data });
};

/**
 * POST /api/v1/firstaid/submit
 * Member submission of a First Aid Guide (Image or Video)
 */
export const submitFirstAid = async (req, res) => {
  const {
    title,
    content,
    category,
    video_url,
    image_url,
    media_type,
    submitted_by_name,
    submitted_by_email,
    submitted_by_id,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const determinedMediaType = media_type || (video_url ? 'video' : 'image');

  const newResource = {
    title: title.trim(),
    content: content || '',
    category: category || 'General Care',
    video_url: video_url || null,
    image_url: image_url || null,
    media_type: determinedMediaType,
    status: 'pending',
    is_published: false,
    submitted_by_name: submitted_by_name || 'Red Cross Member',
    submitted_by_email: submitted_by_email || null,
    submitted_by_id: submitted_by_id ? String(submitted_by_id) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('first_aid')
    .insert([newResource])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Notify admins of new pending first aid submission
  try {
    await supabase.from('notifications').insert([{
      type: 'system',
      text: `New First Aid Guide submitted by ${submitted_by_name || 'a member'}: "${title}"`,
      link: '/firstaid',
      meta: { guideId: data.id, title, submittedBy: submitted_by_name },
      created_at: new Date().toISOString(),
    }]);
  } catch (err) {
    console.warn('Could not create admin notification for first aid submission:', err.message);
  }

  return res.status(201).json({
    success: true,
    message: 'Your first aid guide has been submitted for review! Once verified and approved by the admin, it will be published and broadcast to all members.',
    data,
  });
};

/**
 * GET /api/v1/firstaid/my/:emailOrId
 * Fetch submissions by the current member
 */
export const getMySubmissions = async (req, res) => {
  const { emailOrId } = req.params;

  if (!emailOrId) {
    return res.json({ success: true, data: [] });
  }

  const { data, error } = await supabase
    .from('first_aid')
    .select('*')
    .or(`submitted_by_email.eq.${emailOrId},submitted_by_id.eq.${emailOrId}`)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: data || [] });
};

// ═══════════════════════════════════════════════════════════
// COMMUNITY Q&A (Reddit / Stack Overflow Style)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/v1/firstaid/questions
 * List all questions with sorting & filters
 */
export const getQuestions = async (req, res) => {
  const { sort = 'newest', search, category } = req.query;

  let query = supabase
    .from('questions')
    .select('*');

  if (category && category !== 'all' && category !== 'All') {
    query = query.eq('category', category);
  }

  if (search && search.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,question.ilike.%${search.trim()}%`);
  }

  if (sort === 'votes') {
    query = query.order('votes', { ascending: false }).order('created_at', { ascending: false });
  } else if (sort === 'unanswered') {
    query = query.eq('status', 'unanswered').order('created_at', { ascending: false });
  } else if (sort === 'answers') {
    query = query.order('answers_count', { ascending: false }).order('created_at', { ascending: false });
  } else {
    // Default: newest
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: data || [] });
};

/**
 * GET /api/v1/firstaid/questions/:id
 * Fetch single question with all community & admin answers
 */
export const getQuestionDetails = async (req, res) => {
  const { id } = req.params;

  const [qRes, aRes] = await Promise.all([
    supabase.from('questions').select('*').eq('id', id).single(),
    supabase.from('question_answers').select('*').eq('question_id', id).order('is_accepted', { ascending: false }).order('votes', { ascending: false }).order('created_at', { ascending: true })
  ]);

  if (qRes.error || !qRes.data) {
    return res.status(404).json({ success: false, error: 'Question not found' });
  }

  return res.json({
    success: true,
    data: {
      ...qRes.data,
      answers: aRes.data || [],
    },
  });
};

/**
 * POST /api/v1/firstaid/questions
 * Ask a new question & broadcast to all members and admins via email
 */
export const askQuestion = async (req, res) => {
  const {
    title,
    question,
    text,
    category,
    asked_by,
    asked_by_email,
    asked_by_id,
    asked_by_role = 'Member',
    tags = ['first-aid'],
  } = req.body;

  const questionBody = question || text;
  if (!questionBody || !questionBody.trim()) {
    return res.status(400).json({ success: false, error: 'Question content is required' });
  }

  const displayTitle = (title && title.trim())
    ? title.trim()
    : (questionBody.trim().length > 60 ? `${questionBody.trim().slice(0, 60)}...` : questionBody.trim());

  const newQuestion = {
    title: displayTitle,
    question: questionBody.trim(),
    category: category || 'First Aid & Emergencies',
    asked_by: asked_by || 'Anonymous Member',
    asked_by_email: asked_by_email || null,
    asked_by_id: asked_by_id ? String(asked_by_id) : null,
    asked_by_role: asked_by_role || 'Member',
    votes: 0,
    upvoted_by: [],
    answers_count: 0,
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ['first-aid'],
    status: 'unanswered',
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('questions')
    .insert([newQuestion])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // 1. Dispatch email notification to all members AND admins
  let emailResult = null;
  try {
    emailResult = await sendQuestionNotificationEmail({ question: data });
  } catch (emailErr) {
    console.error('Failed to dispatch question notification email:', emailErr);
  }

  // 2. Insert in-app notification for admins
  try {
    await supabase.from('notifications').insert([{
      type: 'question',
      text: `New Q&A Question posted by ${data.asked_by}: "${data.title}"`,
      link: '/firstaid',
      meta: { questionId: data.id, title: data.title },
      created_at: new Date().toISOString(),
    }]);
  } catch (notifErr) {
    console.warn('Failed to create in-app notification for question:', notifErr.message);
  }

  return res.status(201).json({
    success: true,
    message: `Question posted successfully! ${emailResult?.success ? `Sent to ${emailResult.totalRecipients || 0} members & admins.` : 'Email notification processed.'}`,
    data,
    emailResult,
  });
};

/**
 * POST /api/v1/firstaid/questions/:id/answers
 * Post an answer to a question (open to all members and admins)
 */
export const answerQuestion = async (req, res) => {
  const { id } = req.params;
  const {
    answer_text,
    author_name,
    author_email,
    author_role = 'Member',
  } = req.body;

  if (!answer_text || !answer_text.trim()) {
    return res.status(400).json({ success: false, error: 'Answer content cannot be empty' });
  }

  // 1. Insert new answer
  const newAnswer = {
    question_id: id,
    author_name: author_name || 'Red Cross Member',
    author_email: author_email || null,
    author_role: author_role || 'Member',
    answer_text: answer_text.trim(),
    votes: 0,
    upvoted_by: [],
    is_accepted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: answerData, error: answerError } = await supabase
    .from('question_answers')
    .insert([newAnswer])
    .select()
    .single();

  if (answerError) {
    return res.status(400).json({ success: false, error: answerError.message });
  }

  // 2. Increment question answers_count and update status to answered
  try {
    const { data: currentQ } = await supabase.from('questions').select('answers_count').eq('id', id).single();
    const newCount = (currentQ?.answers_count || 0) + 1;

    await supabase
      .from('questions')
      .update({
        answers_count: newCount,
        status: 'answered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch (e) {
    console.warn('Could not update answers_count on question:', e.message);
  }

  return res.status(201).json({
    success: true,
    message: 'Answer posted successfully! All members can now see your response.',
    data: answerData,
  });
};

/**
 * POST /api/v1/firstaid/questions/:id/vote
 * Upvote or toggle vote on question
 */
export const voteQuestion = async (req, res) => {
  const { id } = req.params;
  const { userIdentifier } = req.body; // email or userId

  const uid = userIdentifier || 'anonymous';

  const { data: q, error: fetchErr } = await supabase
    .from('questions')
    .select('votes, upvoted_by')
    .eq('id', id)
    .single();

  if (fetchErr || !q) {
    return res.status(404).json({ success: false, error: 'Question not found' });
  }

  let upvotedBy = Array.isArray(q.upvoted_by) ? [...q.upvoted_by] : [];
  let votes = q.votes || 0;
  let hasVoted = upvotedBy.includes(uid);

  if (hasVoted) {
    // Un-vote
    upvotedBy = upvotedBy.filter(u => u !== uid);
    votes = Math.max(0, votes - 1);
  } else {
    // Vote up
    upvotedBy.push(uid);
    votes += 1;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('questions')
    .update({ votes, upvoted_by: upvotedBy, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ success: false, error: updateErr.message });
  }

  return res.json({
    success: true,
    votes: updated.votes,
    hasVoted: !hasVoted,
  });
};

/**
 * POST /api/v1/firstaid/answers/:id/vote
 * Upvote or toggle vote on answer
 */
export const voteAnswer = async (req, res) => {
  const { id } = req.params;
  const { userIdentifier } = req.body;

  const uid = userIdentifier || 'anonymous';

  const { data: a, error: fetchErr } = await supabase
    .from('question_answers')
    .select('votes, upvoted_by')
    .eq('id', id)
    .single();

  if (fetchErr || !a) {
    return res.status(404).json({ success: false, error: 'Answer not found' });
  }

  let upvotedBy = Array.isArray(a.upvoted_by) ? [...a.upvoted_by] : [];
  let votes = a.votes || 0;
  let hasVoted = upvotedBy.includes(uid);

  if (hasVoted) {
    upvotedBy = upvotedBy.filter(u => u !== uid);
    votes = Math.max(0, votes - 1);
  } else {
    upvotedBy.push(uid);
    votes += 1;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('question_answers')
    .update({ votes, upvoted_by: upvotedBy, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ success: false, error: updateErr.message });
  }

  return res.json({
    success: true,
    votes: updated.votes,
    hasVoted: !hasVoted,
  });
};

/**
 * PATCH /api/v1/firstaid/answers/:id/accept
 * Mark an answer as accepted
 */
export const acceptAnswer = async (req, res) => {
  const { id } = req.params;

  const { data: targetAnswer, error: findErr } = await supabase
    .from('question_answers')
    .select('question_id, is_accepted')
    .eq('id', id)
    .single();

  if (findErr || !targetAnswer) {
    return res.status(404).json({ success: false, error: 'Answer not found' });
  }

  const newStatus = !targetAnswer.is_accepted;

  // Un-accept any other answers for this question if setting to true
  if (newStatus) {
    await supabase
      .from('question_answers')
      .update({ is_accepted: false })
      .eq('question_id', targetAnswer.question_id);
  }

  const { data: updated, error: updateErr } = await supabase
    .from('question_answers')
    .update({ is_accepted: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ success: false, error: updateErr.message });
  }

  return res.json({
    success: true,
    message: newStatus ? 'Answer marked as accepted solution!' : 'Accepted status removed.',
    data: updated,
  });
};
