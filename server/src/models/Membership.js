import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  },
  { timestamps: { createdAt: 'joinedAt', updatedAt: false } },
);

// One membership per user per community — also the guard for concurrent joins.
membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });
membershipSchema.index({ communityId: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
