import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const userIdOf = (user) => String(user._id || user.id);

export const signAccessToken = (user) =>
  jwt.sign({ sub: userIdOf(user), username: user.username }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl,
  });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: userIdOf(user), type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenDays}d`,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

const cookieSecurity = () => ({
  secure: env.isProduction || env.crossSiteCookies,
  sameSite: env.crossSiteCookies ? 'none' : 'lax',
});

export const refreshCookieOptions = () => ({
  httpOnly: true,
  ...cookieSecurity(),
  path: '/api/auth',
  maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
});

/**
 * Non-sensitive marker readable by JS so the SPA only probes /auth/refresh when a session
 * plausibly exists. Avoids a guaranteed 401 on every guest page load.
 */
export const sessionHintCookieOptions = () => ({
  httpOnly: false,
  ...cookieSecurity(),
  path: '/',
  maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
});
