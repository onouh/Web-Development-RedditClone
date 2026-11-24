import mongoose from 'mongoose';

const aiSummarySchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    bullets: { type: [String], default: [] },
    contentHash: { type: String, default: '' },
    source: { type: String, enum: ['ai', 'fallback', 'skipped'], default: 'fallback' },
    generatedAt: { type: Date },
  },
  { _id: false },
);

const threadSummarySchema = new mongoose.Schema(
  {
    consensus: { type: String, default: '' },
    counterpoints: { type: [String], default: [] },
    tone: { type: String, default: '' },
    summary: { type: String, default: '' },
    commentCount: { type: Number, default: 0 },
    source: { type: String, enum: ['ai', 'fallback'], default: 'fallback' },
    generatedAt: { type: Date },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 3,
      maxlength: 300,
    },
    type: { type: String, enum: ['text', 'link', 'image'], default: 'text' },
    body: { type: String, default: '', maxlength: 40_000 },
    mediaUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    flair: {
      label: { type: String, default: '' },
      color: { type: String, default: '#FF4500' },
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    score: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    aiSummary: { type: aiSummarySchema, default: () => ({}) },
    threadSummary: { type: threadSummarySchema, default: () => ({}) },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isRemovedByMod: { type: Boolean, default: false },
    removalReason: { type: String, default: '' },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isSpoiler: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

postSchema.index({ communityId: 1, createdAt: -1 });
postSchema.index({ communityId: 1, score: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ score: -1 });
postSchema.index({ title: 'text', body: 'text' });
postSchema.index({ authorId: 1, createdAt: -1 });

postSchema.virtual('commentCountLive').get(function commentCountLive() {
  return this.commentCount;
});

export const Post = mongoose.model('Post', postSchema);
