import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #FF4500');
const mediaPath = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === '' || /^https?:\/\//i.test(value) || value.startsWith('/uploads/'),
    'Must be an http(s) URL or an uploaded file path',
  );

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(20)
  .regex(/^[a-z0-9_]+$/, 'Only letters, numbers and underscores');

export const registerSchema = z.object({
  username,
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/[0-9]/, 'Include at least one number'),
  displayName: z.string().trim().max(50).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your username or email').max(120),
  password: z.string().min(1, 'Password is required').max(72),
});

export const updateMeSchema = z.object({
  displayName: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: mediaPath.optional(),
  bannerUrl: mediaPath.optional(),
});

const ruleSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional().default(''),
});

const flairSchema = z.object({
  label: z.string().trim().min(1).max(40),
  color: hexColor.optional().default('#FF4500'),
});

export const createCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Community name must be at least 3 characters')
    .max(24)
    .regex(/^[a-z0-9_]+$/, 'Only letters, numbers and underscores'),
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  iconUrl: mediaPath.optional(),
  bannerUrl: mediaPath.optional(),
  rules: z.array(ruleSchema).max(10).optional(),
  flairs: z.array(flairSchema).max(20).optional(),
});

export const updateCommunitySchema = z.object({
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  iconUrl: mediaPath.optional(),
  bannerUrl: mediaPath.optional(),
  rules: z.array(ruleSchema).max(10).optional(),
  flairs: z.array(flairSchema).max(20).optional(),
});

const postFlair = z.object({
  label: z.string().trim().max(40).optional().default(''),
  color: hexColor.optional().default('#FF4500'),
});

export const createPostSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(300),
  type: z.enum(['text', 'link', 'image']).default('text'),
  body: z.string().max(40_000).optional().default(''),
  mediaUrl: mediaPath.optional().default(''),
  linkUrl: mediaPath.optional().default(''),
  flair: postFlair.optional(),
});

export const updatePostSchema = z.object({
  title: z.string().trim().min(3).max(300).optional(),
  body: z.string().max(40_000).optional(),
  mediaUrl: mediaPath.optional(),
  linkUrl: mediaPath.optional(),
  flair: postFlair.optional(),
  reason: z.string().trim().max(300).optional(),
});

export const voteSchema = z.object({
  value: z.number().int().min(-1).max(1),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(10_000),
  parentCommentId: objectId.nullish(),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(10_000),
});

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sort: z.enum(['new', 'top', 'hot']).optional(),
  time: z.enum(['today', 'week', 'month', 'year', 'all']).optional(),
  scope: z.enum(['home', 'popular', 'all']).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(['all', 'communities', 'users', 'posts']).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const createConversationSchema = z.object({
  participantIds: z.array(objectId).min(1, 'Pick at least one person').max(20),
  title: z.string().trim().max(100).optional(),
});

export const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(3, 'Tell moderators what is wrong').max(300),
});

export const modCheckSchema = z.object({
  communityName: z.string().trim().min(3),
  content: z.string().trim().min(10, 'Provide some content to check').max(10_000),
});

export const banSchema = z.object({
  username: z.string().trim().toLowerCase().min(3),
});

export const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
});
