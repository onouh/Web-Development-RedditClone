import { User } from '../models/User.js';

export async function getPostIds(userId) {
  const user = await User.findById(userId).select('savedPosts').lean();
  return user?.savedPosts || [];
}

/** Add/remove a post from the user's saved list; returns the new saved state. */
export async function toggleSaved(userId, postId) {
  const user = await User.findById(userId).select('savedPosts');
  const exists = user.savedPosts.some((id) => String(id) === String(postId));
  const update = exists ? { $pull: { savedPosts: postId } } : { $addToSet: { savedPosts: postId } };
  await User.updateOne({ _id: userId }, update);
  return !exists;
}
