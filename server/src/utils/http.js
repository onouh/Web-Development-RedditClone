export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const parsePagination = (query, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const paginated = (items, total, page, limit) => ({
  items,
  page,
  limit,
  total,
  hasMore: page * limit < total,
});

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Extract `u/name` mentions from free text. */
export const extractMentions = (text = '') => {
  const names = new Set();
  const re = /(?:^|\s)u\/([a-z0-9_]{3,20})/gi;
  let match = re.exec(text);
  while (match) {
    names.add(match[1].toLowerCase());
    match = re.exec(text);
  }
  return [...names];
};
