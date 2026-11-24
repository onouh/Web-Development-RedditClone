import rateLimit from 'express-rate-limit';

const key = (req) => req.user?.id || req.ip;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later.', status: 429 } },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: key,
  message: { error: { message: 'AI rate limit reached — try again in a minute.', status: 429 } },
});
