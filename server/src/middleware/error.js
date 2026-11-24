import { ApiError } from '../utils/http.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (error, _req, res, _next) => {
  let status = error.status || 500;
  let message = error.message || 'Internal server error';
  const details = error.details;

  if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
  }
  if (error.name === 'MongoServerError' && error.code === 11000) {
    status = 409;
    message = 'That value is already taken';
  }
  if (status >= 500) {
    if (!env.isTest) console.error('[error]', error);
    message = env.isProduction ? 'Internal server error' : message;
  }

  res.status(status).json({ error: { message, status, details } });
};
