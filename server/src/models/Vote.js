import mongoose from 'mongoose';

/**
 * Dedicated vote documents. The unique compound index below is the storage-level
 * guarantee behind the project's voting rule: one active vote per user per target.
 */
const voteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    value: { type: Number, enum: [1, -1], required: true },
  },
  { timestamps: true },
);

voteSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
voteSchema.index({ targetId: 1, targetType: 1, value: 1 });

export const Vote = mongoose.model('Vote', voteSchema);
