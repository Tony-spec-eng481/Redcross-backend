import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../src/utils/token.js';
import { sendSuccess, sendError, AppError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { sendPasswordResetEmail } from '../src/services/emailService.js';

/**
 * POST /api/v1/auth/login
 * Authenticate admin with email + password from Supabase, return JWT tokens
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Database lookup via Supabase
  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (error || !admin) {
    // Prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 200));
    return sendError(res, 'Invalid email or password.', 401);
  }

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
    role: admin.role,
    name: admin.name,
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
    },
  });
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken && req.admin?.id) {
    try {
      const { data: admin } = await supabase
        .from('admins')
        .select('refresh_tokens')
        .eq('id', req.admin.id)
        .single();

      if (admin && Array.isArray(admin.refresh_tokens)) {
        const updatedTokens = admin.refresh_tokens.filter((t) => t !== refreshToken);
        await supabase
          .from('admins')
          .update({
            refresh_tokens: updatedTokens,
            updated_at: new Date().toISOString(),
          })
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

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (error || !admin || !Array.isArray(admin.refresh_tokens) || !admin.refresh_tokens.includes(oldRefreshToken)) {
    return sendError(res, 'Refresh token has been revoked or expired.', 401);
  }

  if (!admin.is_active) {
    return sendError(res, 'Account is inactive.', 403);
  }

  const tokenPayload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
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
  });
});

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return sendError(res, 'Email is required.', 400);

  const normalizedEmail = email.toLowerCase().trim();

  try {
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

      console.log(`🔑 Generated reset token for ${admin.email}`);

      // Dispatch Brevo email
      sendPasswordResetEmail({
        email: admin.email,
        name: admin.name || 'Administrator',
        resetToken,
        userType: 'admin',
      }).catch((emailErr) => {
        console.error('Failed to send password reset email via Brevo:', emailErr);
      });
    }
  } catch (err) {
    console.error('Error in forgotPassword handler:', err);
  }

  return sendSuccess(res, 'If an account exists with that email address, a password reset link has been dispatched.');
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

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, password_reset_expires')
    .eq('password_reset_token', hashedToken)
    .single();

  if (error || !admin) {
    return sendError(res, 'Password reset token is invalid or has expired.', 400);
  }

  if (new Date(admin.password_reset_expires) < new Date()) {
    return sendError(res, 'Password reset token has expired.', 400);
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
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

  return sendSuccess(res, 'Password reset successful. You can now log in.');
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
    .eq('id', req.admin.id)
    .single();

  if (error || !admin) {
    return sendError(res, 'Admin profile not found.', 404);
  }

  return sendSuccess(res, 'Profile fetched.', admin);
});

/**
 * PATCH /api/v1/auth/me
 */
export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  const updates = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;

  const { data, error } = await supabase
    .from('admins')
    .update(updates)
    .eq('id', req.admin.id)
    .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
    .single();

  if (error) {
    return sendError(res, 'Failed to update profile: ' + error.message, 500);
  }

  return sendSuccess(res, 'Profile updated.', data);
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

  const { data: admin, error } = await supabase
    .from('admins')
    .select('password_hash')
    .eq('id', req.admin.id)
    .single();

  if (error || !admin) {
    return sendError(res, 'Admin not found.', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!isMatch) {
    return sendError(res, 'Current password is incorrect.', 400);
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  const { error: updateErr } = await supabase
    .from('admins')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.admin.id);

  if (updateErr) {
    return sendError(res, 'Failed to change password: ' + updateErr.message, 500);
  }

  return sendSuccess(res, 'Password changed successfully.');
});

/**
 * PATCH /api/v1/auth/notification-preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { email, push, approvals, messages } = req.body;

  const { data: currentAdmin } = await supabase
    .from('admins')
    .select('notification_preferences')
    .eq('id', req.admin.id)
    .single();

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
    .eq('id', req.admin.id)
    .select('notification_preferences')
    .single();

  if (error) {
    return sendError(res, 'Failed to update preferences: ' + error.message, 500);
  }

  return sendSuccess(res, 'Notification preferences updated.', data?.notification_preferences || newPrefs);
});
