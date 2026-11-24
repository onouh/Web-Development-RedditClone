import { User } from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { ApiError, asyncHandler } from '../utils/http.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
};

async function resolveUser(req) {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw new ApiError(401, 'Authentication required');
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = await resolveUser(req);
  next();
});
