import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    // Materialised path (root → parent) keeps tree reads a single indexed query.
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    depth: { type: Number, default: 0, max: 30 },
    body: { type: String, required: true, trim: true, maxlength: 10_000 },
    score: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isRemovedByMod: { type: Boolean, default: false },
    removalReason: { type: String, default: '' },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

commentSchema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });
commentSchema.index({ postId: 1, ancestors: 1 });
commentSchema.index({ authorId: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', commentSchema);
