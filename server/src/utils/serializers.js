const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: idOf(user._id || user.id),
    username: user.username,
    displayName: user.displayName || '',
    name: user.displayName || user.username,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    bannerUrl: user.bannerUrl || '',
    postKarma: user.postKarma || 0,
    commentKarma: user.commentKarma || 0,
    karma: (user.postKarma || 0) + (user.commentKarma || 0),
    cakeDay: user.createdAt,
    createdAt: user.createdAt,
  };
}

export function serializeCommunity(community, extra = {}) {
  if (!community) return null;
  return {
    id: idOf(community._id || community.id),
    name: community.name,
    title: community.title || '',
    description: community.description || '',
    iconUrl: community.iconUrl || '',
    bannerUrl: community.bannerUrl || '',
    memberCount: community.memberCount || 0,
    rules: community.rules || [],
    flairs: community.flairs || [],
    creatorId: idOf(community.creatorId),
    createdAt: community.createdAt,
    ...extra,
  };
}

export function serializePost(post, extra = {}) {
  if (!post) return null;
  const author = post.authorId?._id ? post.authorId : null;
  const community = post.communityId?.name ? post.communityId : null;
  return {
    id: idOf(post._id || post.id),
    title: post.isDeleted ? '[deleted]' : post.title,
    type: post.type,
    body: post.isDeleted ? '' : post.body,
    mediaUrl: post.mediaUrl || '',
    linkUrl: post.linkUrl || '',
    flair: post.flair?.label ? post.flair : null,
    score: post.score || 0,
    commentCount: post.commentCount || 0,
    isEdited: post.isEdited,
    isDeleted: post.isDeleted,
    isRemovedByMod: post.isRemovedByMod,
    removalReason: post.isRemovedByMod ? post.removalReason : '',
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: author ? serializeUser(author) : null,
    community: community ? serializeCommunity(community) : null,
    aiSummary: post.aiSummary?.text
      ? {
          text: post.aiSummary.text,
          bullets: post.aiSummary.bullets || [],
          source: post.aiSummary.source,
          generatedAt: post.aiSummary.generatedAt,
          cached: Boolean(post.aiSummary.contentHash),
        }
      : null,
    ...extra,
  };
}

export function serializeComment(comment, extra = {}) {
  const author = comment.authorId?._id ? comment.authorId : null;
  const hidden = comment.isDeleted || comment.isRemovedByMod;
  return {
    id: idOf(comment._id || comment.id),
    postId: idOf(comment.postId),
    parentCommentId: comment.parentCommentId ? idOf(comment.parentCommentId) : null,
    depth: comment.depth || 0,
    body: hidden
      ? comment.isRemovedByMod
        ? '[removed by moderator]'
        : '[deleted]'
      : comment.body,
    score: comment.score || 0,
    isEdited: comment.isEdited,
    isDeleted: comment.isDeleted,
    isRemovedByMod: comment.isRemovedByMod,
    removalReason: comment.isRemovedByMod ? comment.removalReason : '',
    createdAt: comment.createdAt,
    author: hidden ? null : author ? serializeUser(author) : null,
    ...extra,
  };
}

export function serializeNotification(notification) {
  const actor = notification.actorId?._id ? notification.actorId : null;
  return {
    id: idOf(notification._id),
    type: notification.type,
    message: notification.message,
    link: notification.link,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    actor: actor ? serializeUser(actor) : null,
  };
}

export function serializeConversation(conversation, currentUserId) {
  const participants = (conversation.participants || [])
    .filter((p) => p?._id)
    .map((p) => serializeUser(p));
  const other = participants.find((p) => p.id !== String(currentUserId)) || participants[0];
  return {
    id: idOf(conversation._id),
    isGroup: conversation.isGroup,
    title: conversation.isGroup ? conversation.title || 'Group chat' : other?.name || 'Conversation',
    participants,
    otherUser: conversation.isGroup ? null : other,
    lastMessage: conversation.lastMessage?.text || '',
    updatedAt: conversation.updatedAt,
  };
}

export function serializeMessage(message) {
  const sender = message.senderId?._id ? message.senderId : null;
  return {
    id: idOf(message._id),
    conversationId: idOf(message.conversationId),
    content: message.content,
    createdAt: message.createdAt,
    sender: sender ? serializeUser(sender) : null,
  };
}
