import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 50, default: '' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    avatarUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    postKarma: { type: Number, default: 0 },
    commentKarma: { type: Number, default: 0 },
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.email;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.virtual('name').get(function name() {
  return this.displayName || this.username;
});

userSchema.virtual('karma').get(function karma() {
  return (this.postKarma || 0) + (this.commentKarma || 0);
});

userSchema.index({ username: 'text', displayName: 'text' });

export const User = mongoose.model('User', userSchema);
