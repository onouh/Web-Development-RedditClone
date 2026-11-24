import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { serializeUser } from '../utils/serializers.js';
import {
  refreshCookieOptions,
  sessionHintCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

const issueTokens = (res, user) => {
  res.cookie('refreshToken', signRefreshToken(user), refreshCookieOptions());
  res.cookie('threadit_session', '1', sessionHintCookieOptions());
  return signAccessToken(user);
};

const clearSession = (res) => {
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: undefined });
  res.clearCookie('threadit_session', { ...sessionHintCookieOptions(), maxAge: undefined });
};

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, displayName } = req.body;

  const existing = await User.findOne({ $or: [{ username }, { email }] }).select('username email');
  if (existing) {
    throw new ApiError(
      409,
      existing.username === username ? 'That username is already taken' : 'That email is already registered',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    username,
    email,
    passwordHash,
    displayName: displayName || username,
  });

  const accessToken = issueTokens(res, user);
  res.status(201).json({ user: serializeUser(user), accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const lookup = identifier.trim().toLowerCase();

  const user = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] }).select(
    '+passwordHash',
  );
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  const accessToken = issueTokens(res, user);
  user.passwordHash = undefined;
  res.json({ user: serializeUser(user), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    clearSession(res);
    throw new ApiError(401, 'No refresh token');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearSession(res);
    throw new ApiError(401, 'Refresh token expired');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    clearSession(res);
    throw new ApiError(401, 'Account no longer exists');
  }

  const accessToken = issueTokens(res, user);
  res.json({ user: serializeUser(user), accessToken });
});

export const logout = asyncHandler(async (_req, res) => {
  clearSession(res);
  res.json({ message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});
