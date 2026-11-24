import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    reason: { type: String, required: true, maxlength: 300 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

reportSchema.index({ communityId: 1, status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, targetId: 1, targetType: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);
