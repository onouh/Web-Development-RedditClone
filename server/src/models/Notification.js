import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['post_reply', 'comment_reply', 'post_vote', 'comment_vote', 'mod_action', 'mention', 'chat'],
      required: true,
    },
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, default: '/' },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
