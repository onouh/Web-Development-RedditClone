import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    isGroup: { type: Boolean, default: false },
    title: { type: String, trim: true, maxlength: 100, default: '' },
    lastMessage: {
      text: { type: String, default: '' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
    // Pair key for 1-on-1 conversations — prevents duplicate DM threads.
    dmKey: { type: String, default: '', index: true },
    lastRead: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
