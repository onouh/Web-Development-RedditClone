import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false },
);

const flairSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, default: '#FF4500', match: /^#[0-9a-fA-F]{6}$/ },
  },
  { _id: false },
);

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Community name is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: [/^[a-z0-9_]+$/, 'Community name may only contain letters, numbers and underscores'],
    },
    title: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    iconUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    rules: { type: [ruleSchema], default: [] },
    flairs: { type: [flairSchema], default: [] },
    bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

communitySchema.index({ name: 'text', description: 'text' });

export const Community = mongoose.model('Community', communitySchema);
