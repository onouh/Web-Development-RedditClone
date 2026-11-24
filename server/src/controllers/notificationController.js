import { Notification } from '../models/Notification.js';
import { asyncHandler, paginated, parsePagination } from '../utils/http.js';
import { serializeNotification } from '../utils/serializers.js';

const ACTOR_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { recipientId: req.user._id };
  if (req.query.unreadOnly === 'true') filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actorId', ACTOR_FIELDS),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId: req.user._id, isRead: false }),
  ]);

  res.json({ ...paginated(items.map(serializeNotification), total, page, limit), unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.notificationId, recipientId: req.user._id },
    { $set: { isRead: true } },
  );
  res.json({ message: 'Notification read' });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipientId: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.json({ message: 'All notifications read' });
});
