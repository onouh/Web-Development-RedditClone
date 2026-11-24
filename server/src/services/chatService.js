import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { ApiError } from '../utils/http.js';
import { getIO } from '../sockets/realtime.js';
import { serializeMessage } from '../utils/serializers.js';
import { createNotification } from './notificationService.js';

const SENDER_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';

export async function requireParticipant(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  const isMember = conversation.participants.some((id) => String(id) === String(userId));
  if (!isMember) throw new ApiError(403, 'You are not part of this conversation');
  return conversation;
}

/** Persist a message, push it to the conversation room + every participant's personal room. */
export async function sendMessage({ conversationId, senderId, content, tempId }) {
  const text = String(content || '').trim();
  if (!text) throw new ApiError(400, 'Message cannot be empty');
  if (text.length > 4000) throw new ApiError(400, 'Message is too long');

  const conversation = await requireParticipant(conversationId, senderId);

  const message = await Message.create({ conversationId: conversation._id, senderId, content: text });
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: { text: text.slice(0, 140), senderId, createdAt: message.createdAt },
        updatedAt: new Date(),
      },
    },
  );

  await message.populate('senderId', SENDER_FIELDS);
  const payload = serializeMessage(message);

  const io = getIO();
  if (io) {
    const rooms = [
      `conversation:${conversation._id}`,
      ...conversation.participants.map((id) => `user:${id}`),
    ];
    io.to(rooms).emit('message:new', {
      conversationId: String(conversation._id),
      message: payload,
      tempId: tempId || null,
    });
  }

  const recipients = conversation.participants.filter((id) => String(id) !== String(senderId));
  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({
        recipientId,
        actorId: senderId,
        type: 'chat',
        message: `${payload.sender?.username || 'Someone'} sent you a message`,
        link: `/chat?c=${conversation._id}`,
        postId: undefined,
      }),
    ),
  );

  return payload;
}

export async function markConversationRead(conversationId, userId) {
  const conversation = await requireParticipant(conversationId, userId);
  const existing = conversation.lastRead.find((entry) => String(entry.userId) === String(userId));
  if (existing) {
    existing.at = new Date();
  } else {
    conversation.lastRead.push({ userId, at: new Date() });
  }
  await conversation.save();
  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );
  return { read: true };
}
