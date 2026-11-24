import { ZodError } from 'zod';
import { ApiError } from '../utils/http.js';

/**
 * Validate and *replace* req.body / req.query / req.params with parsed values,
 * so only declared fields ever reach controllers (mass-assignment safety).
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ApiError(400, 'Validation failed', details));
    }
    next(error);
  }
};
