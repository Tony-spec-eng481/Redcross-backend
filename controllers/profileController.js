import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

export const getProfile = async (req, res) => {
  const userId = req.admin?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // 1. Try Admin
  const { data: admin } = await supabase
    .from('admins')
    .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
    .eq('id', userId)
    .single();

  if (admin) {
    return res.json({ success: true, data: { ...admin, is_admin: true } });
  }

  // 2. Try Member
  const { data: member } = await supabase
    .from('members')
    .select('id, name, email, phone, role, status, avatar, is_active, joined, last_login, notification_preferences, created_at')
    .eq('id', userId)
    .single();

  if (member) {
    return res.json({ success: true, data: member });
  }

  return res.status(404).json({ success: false, error: 'User profile not found' });
};

export const updateProfile = async (req, res) => {
  const userId = req.admin?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { name, phone, avatar, password, currentPassword } = req.body;
  const updates = { updated_at: new Date().toISOString() };

  if (name !== undefined) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone ? phone.trim() : '';
  if (avatar !== undefined) updates.avatar = avatar;

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

  // 1. Try Admin
  const { data: admin } = await supabase
    .from('admins')
    .select('id, password_hash')
    .eq('id', userId)
    .single();

  if (admin) {
    if (password && password.trim().length >= 6) {
      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!isMatch) {
          return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }
      }
      updates.password_hash = await bcrypt.hash(password.trim(), saltRounds);
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, message: 'Profile updated successfully!', data: { ...data, is_admin: true } });
  }

  // 2. Try Member
  const { data: member } = await supabase
    .from('members')
    .select('id, password_hash')
    .eq('id', userId)
    .single();

  if (member) {
    if (password && password.trim().length >= 6) {
      if (currentPassword) {
        let isMatch = false;
        if (member.password_hash) {
          isMatch = await bcrypt.compare(currentPassword, member.password_hash);
          if (!isMatch && currentPassword === member.password_hash) isMatch = true;
        } else {
          if (currentPassword === 'Redcross' || currentPassword === 'redcross') isMatch = true;
        }

        if (!isMatch) {
          return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }
      }
      updates.password_hash = await bcrypt.hash(password.trim(), saltRounds);
    }

    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, phone, role, status, avatar, is_active, joined, last_login, notification_preferences, created_at')
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, message: 'Profile updated successfully!', data });
  }

  return res.status(404).json({ success: false, error: 'Profile not found' });
};

export const deleteProfile = async (req, res) => {
  const userId = req.admin?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  await supabase.from('members').delete().eq('id', userId);
  return res.json({ success: true, message: 'Profile deleted successfully.' });
};
