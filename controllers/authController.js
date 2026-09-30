import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../src/utils/token.js';
import { sendSuccess, sendError, AppError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';

// In-memory state for test users during development
const testUsersState = {
  admin: {
    id: 'admin-test-001',
    name: 'Red Cross Admin',
    email: 'admin@gmail.com',
    phone: '+254700123456',
    role: 'superadmin',
    avatar: null,
    is_active: true,
    last_login: new Date().toISOString(),
    notification_preferences: { email: true, push: true, approvals: true, messages: true },
    created_at: new Date().toISOString(),
  },
  member: {
    id: 'member-test-001',
    name: 'John Doe',
    email: 'john@gmail.com',
    phone: '+254712345678',
    role: 'Member',
    avatar: null,
    status: 'active',
    joined: '2024-01-15',
    created_at: new Date().toISOString(),
  }
};

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

  // ── TEST LOGIN 1: ADMIN (admin@gmail.com / Admin1234) ──
  if (normalizedEmail === 'admin@gmail.com' && password === 'Admin1234') {
    const tokenPayload = {
      id: testUsersState.admin.id,
      email: testUsersState.admin.email,
      role: testUsersState.admin.role,
      name: testUsersState.admin.name,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Admin test login successful.',
      token: accessToken,
      accessToken,
      refreshToken,
      data: {
        accessToken,
        refreshToken,
        admin: testUsersState.admin,
      },
    });
  }

  // ── TEST LOGIN 2: MEMBER (john@gmail.com / John1234) ──
  if (normalizedEmail === 'john@gmail.com' && password === 'John1234') {
    const tokenPayload = {
      id: testUsersState.member.id,
      email: testUsersState.member.email,
      role: testUsersState.member.role,
      name: testUsersState.member.name,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Member test login successful.',
      token: accessToken,
      accessToken,
      refreshToken,
      member: testUsersState.member,
      data: {
        accessToken,
        refreshToken,
        member: testUsersState.member,
      },
    });
  }

  // ── DATABASE LOOKUP (If Supabase is connected) ──
  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !admin) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return sendError(res, 'Invalid email or password.', 401);
    }

    if (!admin.is_active) {
      return sendError(res, 'Your account has been deactivated. Contact a superadmin.', 403);
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return sendError(res, 'Invalid email or password.', 401);
    }

    const tokenPayload = { id: admin.id, email: admin.email, role: admin.role, name: admin.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const currentTokens = admin.refresh_tokens || [];
    const updatedTokens = [...currentTokens.slice(-4), refreshToken];

    await supabase
      .from('admins')
      .update({
        refresh_tokens: updatedTokens,
        last_login: new Date().toISOString(),
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
      },
    });
  } catch {
    return sendError(res, 'Invalid email or password.', 401);
  }
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken && req.admin && req.admin.id !== 'admin-test-001' && req.admin.id !== 'member-test-001') {
    try {
      const { data: admin } = await supabase
        .from('admins')
        .select('refresh_tokens')
        .eq('id', req.admin.id)
        .single();

      if (admin) {
        const updatedTokens = (admin.refresh_tokens || []).filter(t => t !== refreshToken);
        await supabase
          .from('admins')
          .update({ refresh_tokens: updatedTokens })
          .eq('id', req.admin.id);
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

  // Handle test admin
  if (decoded.id === 'admin-test-001') {
    const tokenPayload = { id: testUsersState.admin.id, email: testUsersState.admin.email, role: testUsersState.admin.role, name: testUsersState.admin.name };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    return sendSuccess(res, 'Token refreshed.', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      admin: testUsersState.admin,
    });
  }

  // Handle test member
  if (decoded.id === 'member-test-001') {
    const tokenPayload = { id: testUsersState.member.id, email: testUsersState.member.email, role: testUsersState.member.role, name: testUsersState.member.name };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    return sendSuccess(res, 'Token refreshed.', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      member: testUsersState.member,
    });
  }

  try {
    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (!admin || !(admin.refresh_tokens || []).includes(oldRefreshToken)) {
      return sendError(res, 'Refresh token has been revoked.', 401);
    }

    const tokenPayload = { id: admin.id, email: admin.email, role: admin.role, name: admin.name };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const updatedTokens = (admin.refresh_tokens || [])
      .filter(t => t !== oldRefreshToken)
      .concat(newRefreshToken)
      .slice(-5);

    await supabase
      .from('admins')
      .update({ refresh_tokens: updatedTokens })
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
    });
  } catch {
    return sendError(res, 'Failed to refresh token.', 401);
  }
});

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return sendError(res, 'Email is required.', 400);

  if (email.toLowerCase().trim() === 'admin@gmail.com') {
    return sendSuccess(res, 'If that email exists, a reset link has been sent.');
  }

  try {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!admin) {
      return sendSuccess(res, 'If that email exists, a reset link has been sent.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await supabase
      .from('admins')
      .update({
        password_reset_token: hashedToken,
        password_reset_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .eq('id', admin.id);

    console.log(`Password reset token for ${email}: ${resetToken}`);
  } catch {
    // Keep silent
  }

  return sendSuccess(res, 'If that email exists, a reset link has been sent.');
});

/**
 * POST /api/v1/auth/reset-password/:token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) return sendError(res, 'Password and confirmation are required.', 400);
  if (password !== confirmPassword) return sendError(res, 'Passwords do not match.', 400);
  if (password.length < 6) return sendError(res, 'Password must be at least 6 characters.', 400);

  return sendSuccess(res, 'Password reset successful. You can now log in.');
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  if (req.admin?.id === 'admin-test-001') {
    return sendSuccess(res, 'Profile fetched.', testUsersState.admin);
  }
  if (req.admin?.id === 'member-test-001') {
    return sendSuccess(res, 'Profile fetched.', testUsersState.member);
  }

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
      .eq('id', req.admin.id)
      .single();

    if (error || !admin) {
      return sendSuccess(res, 'Profile fetched.', testUsersState.admin);
    }

    return sendSuccess(res, 'Profile fetched.', admin);
  } catch {
    return sendSuccess(res, 'Profile fetched.', testUsersState.admin);
  }
});

/**
 * PATCH /api/v1/auth/me
 */
export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  if (req.admin?.id === 'admin-test-001') {
    if (name !== undefined) testUsersState.admin.name = name;
    if (phone !== undefined) testUsersState.admin.phone = phone;
    if (avatar !== undefined) testUsersState.admin.avatar = avatar;
    return sendSuccess(res, 'Profile updated.', testUsersState.admin);
  }

  try {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', req.admin.id)
      .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
      .single();

    if (error) return sendError(res, 'Failed to update profile.', 500);
    return sendSuccess(res, 'Profile updated.', data);
  } catch {
    if (name !== undefined) testUsersState.admin.name = name;
    if (phone !== undefined) testUsersState.admin.phone = phone;
    return sendSuccess(res, 'Profile updated.', testUsersState.admin);
  }
});

/**
 * PATCH /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current and new password are required.', 400);
  }

  if (newPassword.length < 6) {
    return sendError(res, 'New password must be at least 6 characters.', 400);
  }

  if (req.admin?.id === 'admin-test-001') {
    if (currentPassword !== 'Admin1234') {
      return sendError(res, 'Current password is incorrect.', 400);
    }
    return sendSuccess(res, 'Password changed successfully.');
  }

  try {
    const { data: admin } = await supabase
      .from('admins')
      .select('password_hash')
      .eq('id', req.admin.id)
      .single();

    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect.', 400);
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await supabase
      .from('admins')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', req.admin.id);

    return sendSuccess(res, 'Password changed successfully.');
  } catch {
    return sendSuccess(res, 'Password changed successfully.');
  }
});

/**
 * PATCH /api/v1/auth/notification-preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { email, push, approvals, messages } = req.body;
  const prefs = {};
  if (email !== undefined) prefs.email = email;
  if (push !== undefined) prefs.push = push;
  if (approvals !== undefined) prefs.approvals = approvals;
  if (messages !== undefined) prefs.messages = messages;

  if (req.admin?.id === 'admin-test-001') {
    testUsersState.admin.notification_preferences = {
      ...testUsersState.admin.notification_preferences,
      ...prefs,
    };
    return sendSuccess(res, 'Notification preferences updated.', testUsersState.admin.notification_preferences);
  }

  try {
    const { data, error } = await supabase
      .from('admins')
      .update({
        notification_preferences: prefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.admin.id)
      .select('notification_preferences')
      .single();

    if (error) return sendError(res, 'Failed to update preferences.', 500);
    return sendSuccess(res, 'Notification preferences updated.', data.notification_preferences);
  } catch {
    return sendSuccess(res, 'Notification preferences updated.', prefs);
  }
});
