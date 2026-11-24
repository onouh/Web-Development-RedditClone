import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { emitToUser } from '../sockets/realtime.js';
import { serializeNotification } from '../utils/serializers.js';
import { extractMentions } from '../utils/http.js';

const ACTOR_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';

export async function createNotification({ recipientId, actorId, type, message, link = '/', postId }) {
  if (!recipientId) return null;
  if (actorId && String(recipientId) === String(actorId)) return null;

  const notification = await Notification.create({
    recipientId,
    actorId,
    type,
    message,
    link,
    postId,
  });

  const populated = await notification.populate('actorId', ACTOR_FIELDS);
  emitToUser(recipientId, 'notification:new', serializeNotification(populated));
  return notification;
}

/** Parse `u/name` mentions and notify each existing user (excluding the author). */
export async function notifyMentions({ text, actorId, postId, link, messagePrefix = 'mentioned you' }) {
  const names = extractMentions(text);
  if (!names.length) return;

  const users = await User.find({ username: { $in: names } }).select('_id username');
  await Promise.all(
    users.map((user) =>
      createNotification({
        recipientId: user._id,
        actorId,
        type: 'mention',
        message: `${messagePrefix} in a post or comment`,
        link,
        postId,
      }),
    ),
  );
}
