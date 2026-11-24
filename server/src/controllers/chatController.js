import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { serializeConversation, serializeMessage } from '../utils/serializers.js';
import { markConversationRead, requireParticipant, sendMessage } from '../services/chatService.js';

const PARTICIPANT_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ updatedAt: -1 })
    .limit(50)
    .populate('participants', PARTICIPANT_FIELDS)
    .lean();

  const withUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const entry = (conversation.lastRead || []).find(
        (read) => String(read.userId) === String(req.user._id),
      );
      const unreadCount = await Message.countDocuments({
        conversationId: conversation._id,
        senderId: { $ne: req.user._id },
        ...(entry?.at ? { createdAt: { $gt: entry.at } } : {}),
      });
      return { ...serializeConversation(conversation, req.user._id), unreadCount };
    }),
  );

  res.json({ items: withUnread });
});

export const createConversation = asyncHandler(async (req, res) => {
  const participantIds = [...new Set(req.body.participantIds.map(String))].filter(
    (id) => id !== String(req.user._id),
  );
  if (!participantIds.length) throw new ApiError(400, 'Pick at least one other participant');
  if (participantIds.length > 20) throw new ApiError(400, 'Conversations support up to 20 people');

  const existingUsers = await User.countDocuments({ _id: { $in: participantIds } });
  if (existingUsers !== participantIds.length) throw new ApiError(404, 'One or more users not found');

  const members = [String(req.user._id), ...participantIds];
  const isGroup = members.length > 2;
  const dmKey = isGroup ? '' : [...members].sort().join(':');

  if (!isGroup) {
    const existing = await Conversation.findOne({ dmKey }).populate('participants', PARTICIPANT_FIELDS);
    if (existing) {
      return res.json({ conversation: serializeConversation(existing, req.user._id), created: false });
    }
  }

  const conversation = await Conversation.create({
    participants: members,
    isGroup,
    title: isGroup ? req.body.title || 'Group chat' : '',
    dmKey,
  });
  await conversation.populate('participants', PARTICIPANT_FIELDS);

  res.status(201).json({
    conversation: { ...serializeConversation(conversation, req.user._id), unreadCount: 0 },
    created: true,
  });
});

export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await requireParticipant(id, req.user._id);

  const limit = Math.min(50, Number(req.query.limit) || 30);
  const filter = { conversationId: id };
  if (req.query.before && mongoose.isValidObjectId(req.query.before)) {
    filter._id = { $lt: req.query.before };
  }

  const messages = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate('senderId', PARTICIPANT_FIELDS);

  const hasMore = messages.length > limit;
  const page = messages.slice(0, limit).reverse();

  res.json({ items: page.map(serializeMessage), hasMore });
});

export const postMessage = asyncHandler(async (req, res) => {
  const message = await sendMessage({
    conversationId: req.params.id,
    senderId: req.user._id,
    content: req.body.content,
  });
  res.status(201).json({ message });
});

export const readConversation = asyncHandler(async (req, res) => {
  const result = await markConversationRead(req.params.id, req.user._id);
  res.json(result);
});
