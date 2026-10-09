import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../src/utils/token.js';
import { sendSuccess, sendError, AppError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { sendPasswordResetEmail } from '../src/services/emailService.js';

/**
 * POST /api/v1/auth/login
 * Authenticate admin or member with email + password, return JWT tokens
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

  // 1. Try finding in Admins table
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (admin) {
    if (!admin.is_active) {
      return sendError(res, 'Your account has been deactivated. Contact a superadmin.', 403);
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return sendError(res, 'Invalid email or password.', 401);
    }

    const tokenPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role || 'admin',
      name: admin.name,
      is_admin: true,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const currentTokens = Array.isArray(admin.refresh_tokens) ? admin.refresh_tokens : [];
    const updatedTokens = [...currentTokens.slice(-4), refreshToken];

    await supabase
      .from('admins')
      .update({
        refresh_tokens: updatedTokens,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, refresh_tokens, password_reset_token, password_reset_expires, ...safeAdmin } = admin;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: accessToken,
      accessToken,
      refreshToken,
      data: {
        accessToken,
        refreshToken,
        admin: safeAdmin,
        user: { ...safeAdmin, is_admin: true },
        role: admin.role || 'admin',
      },
      admin: safeAdmin,
      user: { ...safeAdmin, is_admin: true },
    });
  }

  // 2. Try finding in Members table
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (member) {
    const status = (member.status || '').toLowerCase();
    if (status === 'rejected') {
      return sendError(res, 'Your membership application was not approved. Contact chapter leadership.', 403);
    }
    if (status === 'inactive' || member.is_active === false) {
      return sendError(res, 'Your member account is currently inactive. Contact chapter admin.', 403);
    }

    let isMatch = false;

    if (member.password_hash) {
      // Check bcrypt password hash
      isMatch = await bcrypt.compare(password, member.password_hash);
      // Fallback: if plain text match (e.g. initial setup)
      if (!isMatch && password === member.password_hash) {
        isMatch = true;
        // Upgrade to bcrypt hash
        const newHash = await bcrypt.hash(password, saltRounds);
        await supabase.from('members').update({ password_hash: newHash }).eq('id', member.id);
      }
    } else {
      // If no password_hash is set yet, check default password 'Redcross'
      if (password === 'Redcross' || password === 'redcross') {
        isMatch = true;
        // Save initial hashed password
        const newHash = await bcrypt.hash('Redcross', saltRounds);
        await supabase.from('members').update({ password_hash: newHash }).eq('id', member.id);
      }
    }

    if (!isMatch) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return sendError(res, 'Invalid email or password.', 401);
    }

    const tokenPayload = {
      id: member.id,
      email: member.email,
      role: member.role || 'Member',
      name: member.name,
      is_member: true,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const currentTokens = Array.isArray(member.refresh_tokens) ? member.refresh_tokens : [];
    const updatedTokens = [...currentTokens.slice(-4), refreshToken];

    await supabase
      .from('members')
      .update({
        refresh_tokens: updatedTokens,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, refresh_tokens, password_reset_token, password_reset_expires, ...safeMember } = member;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: accessToken,
      accessToken,
      refreshToken,
      data: {
        accessToken,
        refreshToken,
        member: safeMember,
        user: safeMember,
        role: member.role || 'Member',
      },
      member: safeMember,
      user: safeMember,
    });
  }

  // Not found in admins or members
  await new Promise((resolve) => setTimeout(resolve, 200));
  return sendError(res, 'Invalid email or password.', 401);
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken && req.admin?.id) {
    try {
      // 1. Try admin table
      const { data: admin } = await supabase
        .from('admins')
        .select('refresh_tokens')
        .eq('id', req.admin.id)
        .single();

      if (admin && Array.isArray(admin.refresh_tokens)) {
        const updatedTokens = admin.refresh_tokens.filter((t) => t !== refreshToken);
        await supabase
          .from('admins')
          .update({ refresh_tokens: updatedTokens, updated_at: new Date().toISOString() })
          .eq('id', req.admin.id);
      } else {
        // 2. Try member table
        const { data: member } = await supabase
          .from('members')
          .select('refresh_tokens')
          .eq('id', req.admin.id)
          .single();

        if (member && Array.isArray(member.refresh_tokens)) {
          const updatedTokens = member.refresh_tokens.filter((t) => t !== refreshToken);
          await supabase
            .from('members')
            .update({ refresh_tokens: updatedTokens, updated_at: new Date().toISOString() })
            .eq('id', req.admin.id);
        }
      }
    } catch {
      // Ignore DB error during logout
    }
  }

  res.clearCookie('refreshToken');
  return sendSuccess(res, 'Logged out successfully.');
});

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!oldRefreshToken) {
    return sendError(res, 'Refresh token is required.', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch {
    return sendError(res, 'Invalid or expired refresh token.', 401);
  }

  // 1. Check Admins table
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (admin) {
    if (!admin.is_active) return sendError(res, 'Account is inactive.', 403);
    if (!Array.isArray(admin.refresh_tokens) || !admin.refresh_tokens.includes(oldRefreshToken)) {
      return sendError(res, 'Refresh token has been revoked or expired.', 401);
    }

    const tokenPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      is_admin: true,
    };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const updatedTokens = admin.refresh_tokens
      .filter((t) => t !== oldRefreshToken)
      .concat(newRefreshToken)
      .slice(-5);

    await supabase
      .from('admins')
      .update({
        refresh_tokens: updatedTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, refresh_tokens, password_reset_token, password_reset_expires, ...safeAdmin } = admin;

    return sendSuccess(res, 'Token refreshed.', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      admin: safeAdmin,
      user: safeAdmin,
    });
  }

  // 2. Check Members table
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (member) {
    if (member.status === 'inactive' || member.is_active === false) {
      return sendError(res, 'Account is inactive.', 403);
    }
    if (!Array.isArray(member.refresh_tokens) || !member.refresh_tokens.includes(oldRefreshToken)) {
      return sendError(res, 'Refresh token has been revoked or expired.', 401);
    }

    const tokenPayload = {
      id: member.id,
      email: member.email,
      role: member.role || 'Member',
      name: member.name,
      is_member: true,
    };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const updatedTokens = member.refresh_tokens
      .filter((t) => t !== oldRefreshToken)
      .concat(newRefreshToken)
      .slice(-5);

    await supabase
      .from('members')
      .update({
        refresh_tokens: updatedTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, refresh_tokens, password_reset_token, password_reset_expires, ...safeMember } = member;

    return sendSuccess(res, 'Token refreshed.', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      member: safeMember,
      user: safeMember,
    });
  }

  return sendError(res, 'Invalid user account for token refresh.', 401);
});

/**
 * POST /api/v1/auth/forgot-password
 * Handles password reset requests for both Admins and Members
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return sendError(res, 'Email is required.', 400);

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Check Admins table
    const { data: admin } = await supabase
      .from('admins')
      .select('id, name, email')
      .eq('email', normalizedEmail)
      .single();

    if (admin) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await supabase
        .from('admins')
        .update({
          password_reset_token: hashedToken,
          password_reset_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', admin.id);

      console.log(`🔑 Generated reset token for Admin: ${admin.email}`);

      // Dispatch Brevo email
      sendPasswordResetEmail({
        email: admin.email,
        name: admin.name || 'Administrator',
        resetToken,
        userType: 'admin',
      }).catch((emailErr) => {
        console.error('Failed to send admin password reset email via Brevo:', emailErr);
      });

      return sendSuccess(res, 'If an account exists with that email address, a password reset link has been dispatched.');
    }

    // 2. Check Members table
    const { data: member } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('email', normalizedEmail)
      .single();

    if (member) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await supabase
        .from('members')
        .update({
          password_reset_token: hashedToken,
          password_reset_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      console.log(`🔑 Generated reset token for Member: ${member.email}`);

      // Dispatch Brevo email
      sendPasswordResetEmail({
        email: member.email,
        name: member.name || 'Chapter Member',
        resetToken,
        userType: 'member',
      }).catch((emailErr) => {
        console.error('Failed to send member password reset email via Brevo:', emailErr);
      });
    }
  } catch (err) {
    console.error('Error in forgotPassword handler:', err);
  }

  return sendSuccess(res, 'If an account exists with that email address, a password reset link has been dispatched.');
});

/**
 * POST /api/v1/auth/reset-password/:token
 * Validates token and resets password for Admin or Member
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) return sendError(res, 'Password and confirmation are required.', 400);
  if (password !== confirmPassword) return sendError(res, 'Passwords do not match.', 400);
  if (password.length < 6) return sendError(res, 'Password must be at least 6 characters.', 400);

  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

  // 1. Check Admins table
  const { data: admin } = await supabase
    .from('admins')
    .select('id, password_reset_expires')
    .eq('password_reset_token', hashedToken)
    .single();

  if (admin) {
    if (new Date(admin.password_reset_expires) < new Date()) {
      return sendError(res, 'Password reset token has expired. Please request a new one.', 400);
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    await supabase
      .from('admins')
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    return sendSuccess(res, 'Password reset successful. You can now log in with your new credentials.');
  }

  // 2. Check Members table
  const { data: member } = await supabase
    .from('members')
    .select('id, password_reset_expires')
    .eq('password_reset_token', hashedToken)
    .single();

  if (member) {
    if (new Date(member.password_reset_expires) < new Date()) {
      return sendError(res, 'Password reset token has expired. Please request a new one.', 400);
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    await supabase
      .from('members')
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);

    return sendSuccess(res, 'Password reset successful. You can now log in with your new credentials.');
  }

  return sendError(res, 'Password reset token is invalid or has expired.', 400);
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const userId = req.admin.id;

  // 1. Try Admin table
  const { data: admin } = await supabase
    .from('admins')
    .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
    .eq('id', userId)
    .single();

  if (admin) {
    return sendSuccess(res, 'Admin profile fetched.', { ...admin, is_admin: true });
  }

  // 2. Try Member table
  const { data: member } = await supabase
    .from('members')
    .select('id, name, email, phone, role, status, avatar, is_active, joined, last_login, notification_preferences, created_at')
    .eq('id', userId)
    .single();

  if (member) {
    return sendSuccess(res, 'Member profile fetched.', member);
  }

  return sendError(res, 'User profile not found.', 404);
});

/**
 * PATCH /api/v1/auth/me
 */
export const updateMe = asyncHandler(async (req, res) => {
  const userId = req.admin.id;
  const { name, phone, avatar } = req.body;

  const updates = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone ? phone.trim() : '';
  if (avatar !== undefined) updates.avatar = avatar;

  // 1. Try Admin table
  const { data: adminData } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .single();

  if (adminData) {
    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
      .single();

    if (error) return sendError(res, 'Failed to update admin profile: ' + error.message, 500);
    return sendSuccess(res, 'Profile updated.', { ...data, is_admin: true });
  }

  // 2. Try Member table
  const { data: memberData, error: memberErr } = await supabase
    .from('members')
    .update(updates)
    .eq('id', userId)
    .select('id, name, email, phone, role, status, avatar, is_active, joined, last_login, notification_preferences, created_at')
    .single();

  if (memberErr || !memberData) {
    return sendError(res, 'Failed to update profile: ' + (memberErr?.message || 'User not found'), 500);
  }

  return sendSuccess(res, 'Profile updated.', memberData);
});

/**
 * PATCH /api/v1/auth/change-password
 * Allows Admin or Member to securely change their password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.admin.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current and new password are required.', 400);
  }

  if (newPassword.length < 6) {
    return sendError(res, 'New password must be at least 6 characters.', 400);
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

  // 1. Check Admin table
  const { data: admin } = await supabase
    .from('admins')
    .select('id, password_hash')
    .eq('id', userId)
    .single();

  if (admin) {
    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const { error: updateErr } = await supabase
      .from('admins')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    if (updateErr) return sendError(res, 'Failed to change password: ' + updateErr.message, 500);
    return sendSuccess(res, 'Password changed successfully.');
  }

  // 2. Check Member table
  const { data: member } = await supabase
    .from('members')
    .select('id, password_hash')
    .eq('id', userId)
    .single();

  if (member) {
    let isMatch = false;

    if (member.password_hash) {
      isMatch = await bcrypt.compare(currentPassword, member.password_hash);
      if (!isMatch && currentPassword === member.password_hash) {
        isMatch = true;
      }
    } else {
      // Default password was 'Redcross'
      if (currentPassword === 'Redcross' || currentPassword === 'redcross') {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return sendError(res, 'Current password is incorrect.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const { error: updateErr } = await supabase
      .from('members')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);

    if (updateErr) return sendError(res, 'Failed to change password: ' + updateErr.message, 500);
    return sendSuccess(res, 'Password changed successfully.');
  }

  return sendError(res, 'User account not found.', 404);
});

/**
 * PATCH /api/v1/auth/notification-preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.admin.id;
  const { email, push, approvals, messages } = req.body;

  // 1. Try Admin
  const { data: currentAdmin } = await supabase
    .from('admins')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (currentAdmin) {
    const currentPrefs = currentAdmin?.notification_preferences || {};
    const newPrefs = {
      ...currentPrefs,
      ...(email !== undefined && { email }),
      ...(push !== undefined && { push }),
      ...(approvals !== undefined && { approvals }),
      ...(messages !== undefined && { messages }),
    };

    const { data, error } = await supabase
      .from('admins')
      .update({
        notification_preferences: newPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('notification_preferences')
      .single();

    if (error) return sendError(res, 'Failed to update preferences: ' + error.message, 500);
    return sendSuccess(res, 'Notification preferences updated.', data?.notification_preferences || newPrefs);
  }

  // 2. Try Member
  const { data: currentMember } = await supabase
    .from('members')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (currentMember) {
    const currentPrefs = currentMember?.notification_preferences || {};
    const newPrefs = {
      ...currentPrefs,
      ...(email !== undefined && { email }),
      ...(push !== undefined && { push }),
      ...(messages !== undefined && { messages }),
    };

    const { data, error } = await supabase
      .from('members')
      .update({
        notification_preferences: newPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('notification_preferences')
      .single();

    if (error) return sendError(res, 'Failed to update preferences: ' + error.message, 500);
    return sendSuccess(res, 'Notification preferences updated.', data?.notification_preferences || newPrefs);
  }

  return sendError(res, 'User not found.', 404);
});
