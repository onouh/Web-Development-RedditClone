import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Vote } from '../models/Vote.js';
import { ApiError, sleep } from '../utils/http.js';

const TARGETS = {
  post: { model: Post, karmaField: 'postKarma' },
  comment: { model: Comment, karmaField: 'commentKarma' },
};

const MAX_ATTEMPTS = 5;

/**
 * Score delta for a vote transition. Mirrors the project's voting table:
 *   none→+1:+1   none→-1:-1   +1→+1 (toggle off):-1   -1→-1 (toggle off):+1
 *   +1→-1:-2     -1→+1:+2     any→0 (remove):-previous
 */
export function voteDelta(previous, next) {
  if (previous === next || next === 0) return -previous;
  return next - previous;
}

const isTransient = (error) =>
  error?.code === 11000 ||
  error?.code === 112 ||
  error?.code === 244 ||
  error?.hasErrorLabel?.('TransientTransactionError') ||
  error?.errorLabels?.includes('TransientTransactionError');

/**
 * Concurrency-safe vote mutation.
 *
 * - Unique index (userId, targetId, targetType) makes duplicate active votes impossible.
 * - The vote write + target score $inc + author karma $inc happen in ONE ACID transaction,
 *   so a crash can never leave the score out of sync with the votes collection.
 * - WriteConflict / DuplicateKey are retried with jittered backoff; withTransaction also
 *   retries TransientTransactionError itself.
 */
export async function castVote({ userId, targetId, targetType, value }) {
  const target = TARGETS[targetType];
  if (!target) throw new ApiError(400, 'Invalid vote target type');
  if (![1, -1, 0].includes(value)) throw new ApiError(400, 'Vote value must be 1, -1 or 0');

  const targetDoc = await target.model
    .findById(targetId)
    .select('authorId isDeleted isRemovedByMod score')
    .lean();
  if (!targetDoc) throw new ApiError(404, `${targetType === 'post' ? 'Post' : 'Comment'} not found`);
  if (targetDoc.isDeleted) throw new ApiError(400, 'Cannot vote on a deleted item');

  let result = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      result = await session.withTransaction(
        async () => {
          const existing = await Vote.findOne({ userId, targetId, targetType }).session(session);
          const previous = existing?.value ?? 0;
          // Requesting the same value again toggles the vote off, exactly like value 0.
          const removing = value === 0 || previous === value;
          const delta = voteDelta(previous, value);

          if (delta === 0) {
            return { score: targetDoc.score ?? 0, userVote: 0, delta: 0 };
          }

          if (removing) {
            await Vote.deleteOne({ _id: existing._id }, { session });
          } else if (previous === 0) {
            await Vote.create([{ userId, targetId, targetType, value }], { session });
          } else {
            await Vote.updateOne({ _id: existing._id }, { $set: { value } }, { session });
          }

          const updated = await target.model.findOneAndUpdate(
            { _id: targetId, isDeleted: false },
            { $inc: { score: delta } },
            { new: true, session, projection: { score: 1, authorId: 1 } },
          );
          if (!updated) throw new ApiError(404, 'Vote target disappeared');

          if (targetDoc.authorId) {
            await User.updateOne(
              { _id: targetDoc.authorId },
              { $inc: { [target.karmaField]: delta } },
              { session },
            );
          }

          return { score: updated.score, userVote: removing ? 0 : value, delta };
        },
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
      );
      break;
    } catch (error) {
      if (error instanceof ApiError || !isTransient(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(15 + Math.floor(Math.random() * 35));
    } finally {
      await session.endSession();
    }
  }

  return result;
}

/** Fetch the current user's votes for a page of targets. */
export async function getUserVoteMap(userId, targetType, targetIds) {
  if (!userId || !targetIds.length) return new Map();
  const votes = await Vote.find({
    userId,
    targetType,
    targetId: { $in: targetIds },
  }).lean();
  return new Map(votes.map((vote) => [String(vote.targetId), vote.value]));
}

export async function getUserVotesForTargets(userId, targetType, targetIds) {
  return getUserVoteMap(userId, targetType, targetIds);
}
