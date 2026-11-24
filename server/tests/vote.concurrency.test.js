import http from 'node:http';
import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { initSocketServer } from '../src/sockets/index.js';
import { Comment } from '../src/models/Comment.js';
import { Community } from '../src/models/Community.js';
import { Conversation } from '../src/models/Conversation.js';
import { Membership } from '../src/models/Membership.js';
import { Message } from '../src/models/Message.js';
import { Post } from '../src/models/Post.js';
import { User } from '../src/models/User.js';
import { Vote } from '../src/models/Vote.js';
import { signAccessToken } from '../src/utils/tokens.js';

let replSet;
let httpServer;
let baseUrl;
let port;

const PASSWORD = 'Password123!';

async function createUser(username, extra = {}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  return User.create({
    username,
    email: `${username}@test.local`,
    passwordHash,
    displayName: username,
    ...extra,
  });
}

const auth = (user) => ({ Authorization: `Bearer ${signAccessToken(user)}` });

async function createCommunity(owner, name = 'testsub') {
  const community = await Community.create({
    name,
    title: 'Test Sub',
    description: 'A community used by automated tests',
    creatorId: owner._id,
    moderators: [owner._id],
    memberCount: 1,
    rules: [{ title: 'Be civil', description: 'No insults or harassment' }],
    flairs: [{ label: 'Discussion', color: '#FF4500' }],
  });
  await Membership.create({ userId: owner._id, communityId: community._id });
  return community;
}

async function createPost(author, community, extra = {}) {
  return Post.create({
    title: 'A post for concurrency testing',
    type: 'text',
    body: 'x'.repeat(300),
    authorId: author._id,
    communityId: community._id,
    ...extra,
  });
}

async function vote(user, postId, value) {
  return request(app)
    .put(`/api/posts/${postId}/vote`)
    .set(auth(user))
    .send({ value });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri('reddit_clone_test'));
  await Promise.all([Post.init(), Vote.init(), Membership.init(), User.init(), Community.init(), Comment.init()]);

  httpServer = http.createServer(app);
  initSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  port = httpServer.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  // deleteMany (not dropDatabase) avoids racing background index builds.
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

describe('voting rule — sequential transitions', () => {
  it('toggles, switches and removes votes with an exact score', async () => {
    const user = await createUser('voter');
    const community = await createCommunity(user);
    const post = await createPost(user, community);

    let res = await vote(user, post._id, 1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ score: 1, userVote: 1 });
    expect(await Vote.countDocuments({ targetId: post._id })).toBe(1);

    // Same value toggles the vote off (resulting state is no vote).
    res = await vote(user, post._id, 1);
    expect(res.body).toMatchObject({ score: 0, userVote: 0 });
    expect(await Vote.countDocuments({ targetId: post._id })).toBe(0);

    res = await vote(user, post._id, -1);
    expect(res.body).toMatchObject({ score: -1, userVote: -1 });

    // Switch -1 → +1 produces a +2 delta.
    res = await vote(user, post._id, 1);
    expect(res.body).toMatchObject({ score: 1, userVote: 1 });

    res = await vote(user, post._id, 0);
    expect(res.body).toMatchObject({ score: 0, userVote: 0 });
    expect(await Vote.countDocuments({ targetId: post._id })).toBe(0);

    const refreshed = await Post.findById(post._id);
    expect(refreshed.score).toBe(0);
  });

  it('tracks post karma on the author inside the vote transaction', async () => {
    const author = await createUser('author');
    const voter = await createUser('voter2');
    const community = await createCommunity(author);
    const post = await createPost(author, community);

    await vote(voter, post._id, 1);
    let refreshed = await User.findById(author._id);
    expect(refreshed.postKarma).toBe(1);

    await vote(voter, post._id, -1);
    refreshed = await User.findById(author._id);
    expect(refreshed.postKarma).toBe(-1);
    expect((await Post.findById(post._id)).score).toBe(-1);
  });
});

describe('voting rule — concurrent storms', () => {
  it('keeps exactly one vote and a matching score for 20 simultaneous changes by one user', async () => {
    const author = await createUser('author');
    const voter = await createUser('storm');
    const community = await createCommunity(author);
    const post = await createPost(author, community);

    const values = [1, -1, 0, 1, 1, -1, 0, 1, -1, 1, 0, -1, 1, -1, 1, 0, -1, 1, -1, 0];
    const responses = await Promise.all(values.map((value) => vote(voter, post._id, value)));

    for (const response of responses) {
      expect(response.status).toBe(200);
    }

    const votes = await Vote.find({ userId: voter._id, targetId: post._id, targetType: 'post' });
    expect(votes.length).toBeLessThanOrEqual(1);

    const refreshed = await Post.findById(post._id);
    const expected = votes[0]?.value ?? 0;
    expect(refreshed.score).toBe(expected);

    const expectedKarma = await User.findById(author._id).then((user) => user.postKarma);
    expect(expectedKarma).toBe(expected);
  });

  it('serialises 50 different users upvoting the same post without lost updates', async () => {
    const author = await createUser('author50');
    const community = await createCommunity(author);
    const post = await createPost(author, community);

    const voters = await User.insertMany(
      Array.from({ length: 50 }, (_, index) => ({
        username: `voter_${index}`,
        email: `voter_${index}@test.local`,
        passwordHash: 'x',
        displayName: `Voter ${index}`,
      })),
    );

    const responses = await Promise.all(voters.map((voter) => vote(voter, post._id, 1)));
    expect(responses.every((response) => response.status === 200)).toBe(true);

    expect(await Vote.countDocuments({ targetId: post._id, targetType: 'post' })).toBe(50);
    const refreshed = await Post.findById(post._id);
    expect(refreshed.score).toBe(50);
    expect((await User.findById(author._id)).postKarma).toBe(50);
  });

  it('enforces the unique compound vote index at the storage layer', async () => {
    const user = await createUser('dupe');
    const author = await createUser('author2');
    const community = await createCommunity(author);
    const post = await createPost(author, community);

    await Vote.create({ userId: user._id, targetId: post._id, targetType: 'post', value: 1 });
    await expect(
      Vote.create({ userId: user._id, targetId: post._id, targetType: 'post', value: 1 }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('does not double count concurrent joins to the same community', async () => {
    const owner = await createUser('owner');
    const joiner = await createUser('joiner');
    const community = await createCommunity(owner);

    const responses = await Promise.all([
      request(app).post('/api/communities/testsub/join').set(auth(joiner)),
      request(app).post('/api/communities/testsub/join').set(auth(joiner)),
      request(app).post('/api/communities/testsub/join').set(auth(joiner)),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 409, 409]);
    expect(await Membership.countDocuments({ communityId: community._id, userId: joiner._id })).toBe(1);
    const refreshed = await Community.findById(community._id);
    expect(refreshed.memberCount).toBe(2);
  });
});

describe('auth, content and comments', () => {
  it('registers, logs in and returns the session user', async () => {
    const register = await request(app).post('/api/auth/register').send({
      username: 'new_user',
      email: 'new_user@example.com',
      password: 'Password123!',
    });
    expect(register.status).toBe(201);
    expect(register.body.user.username).toBe('new_user');
    expect(register.body.user.email).toBeUndefined();
    expect(register.body.accessToken).toBeTruthy();

    const me = await request(app).get('/api/auth/me').set(auth(register.body.user));
    expect(me.status).toBe(200);

    const duplicate = await request(app).post('/api/auth/register').send({
      username: 'new_user',
      email: 'other@example.com',
      password: 'Password123!',
    });
    expect(duplicate.status).toBe(409);

    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'new_user', password: 'wrong-password' });
    expect(badLogin.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'new_user', password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie'].join(';')).toContain('refreshToken=');
  });

  it('creates a community and post through the API and returns them in the feed', async () => {
    const user = await createUser('creator');
    const createCommunityRes = await request(app)
      .post('/api/communities')
      .set(auth(user))
      .send({ name: 'apitest', title: 'API Test', description: 'Testing endpoints' });
    expect(createCommunityRes.status).toBe(201);
    expect(createCommunityRes.body.community.isModerator).toBe(true);

    const createPostRes = await request(app)
      .post('/api/communities/apitest/posts')
      .set(auth(user))
      .send({ title: 'Hello from the API test', type: 'text', body: 'Some body text for the feed.' });
    expect(createPostRes.status).toBe(201);
    expect(createPostRes.body.post.community.name).toBe('apitest');

    const feed = await request(app).get('/api/feed');
    expect(feed.status).toBe(200);
    expect(feed.body.items.length).toBe(1);
    expect(feed.body.items[0].userVote).toBe(0);
  });

  it('builds nested comment trees and applies comment karma', async () => {
    const author = await createUser('poster');
    const commenter = await createUser('commenter');
    const community = await createCommunity(author);
    const post = await createPost(author, community);

    const top = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(commenter))
      .send({ body: 'A top level comment' });
    expect(top.status).toBe(201);

    const reply = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(author))
      .send({ body: 'A nested reply', parentCommentId: top.body.comment.id });
    expect(reply.status).toBe(201);
    expect(reply.body.comment.depth).toBe(1);

    const tree = await request(app).get(`/api/posts/${post._id}/comments`);
    expect(tree.status).toBe(200);
    expect(tree.body.items).toHaveLength(1);
    expect(tree.body.items[0].replies).toHaveLength(1);
    expect(tree.body.items[0].replies[0].body).toBe('A nested reply');

    expect((await Post.findById(post._id)).commentCount).toBe(2);

    const voteRes = await request(app)
      .put(`/api/comments/${top.body.comment.id}/vote`)
      .set(auth(author))
      .send({ value: 1 });
    expect(voteRes.status).toBe(200);
    expect((await User.findById(commenter._id)).commentKarma).toBe(1);
    expect((await Comment.findById(top.body.comment.id)).score).toBe(1);
  });
});

describe('AI and search', () => {
  it('summarizes posts, caches the result and serves a thread digest without an API key', async () => {
    const author = await createUser('ai_author');
    const community = await createCommunity(author);
    const post = await createPost(author, community, {
      title: 'Understanding database transactions',
      body: 'Transactions group several operations into one atomic unit. If one write fails, every write rolls back, so readers never observe a partial result. Replica sets are required because the transaction log must be replicated. Write conflicts are expected under concurrency and should be retried with jittered backoff. Unique indexes provide an additional guarantee at the storage layer. This paragraph exists to push the content over the summarizer minimum length.',
    });

    const first = await request(app)
      .post(`/api/posts/${post._id}/summarize`)
      .set(auth(author));
    expect(first.status).toBe(200);
    expect(first.body.summary.text.length).toBeGreaterThan(20);
    expect(first.body.summary.source).toBe('fallback');
    expect(first.body.summary.cached).toBe(false);

    const second = await request(app)
      .post(`/api/posts/${post._id}/summarize`)
      .set(auth(author));
    expect(second.status).toBe(200);
    expect(second.body.summary.cached).toBe(true);

    await Comment.create({
      postId: post._id,
      authorId: author._id,
      body: 'This explanation finally made write conflicts click for me. The retry detail is the part most tutorials skip.',
      depth: 0,
    });
    await Post.updateOne({ _id: post._id }, { $set: { commentCount: 1 } });

    const digest = await request(app)
      .post(`/api/posts/${post._id}/comments/summarize`)
      .set(auth(author));
    expect(digest.status).toBe(200);
    expect(digest.body.digest.tone).toBeTruthy();
    expect(digest.body.digest.consensus.length).toBeGreaterThan(0);
  });

  it('searches communities, users and posts', async () => {
    const author = await createUser('searcher');
    const community = await createCommunity(author, 'searchable');
    await createPost(author, community, { title: 'An unforgettable searchable title' });

    const res = await request(app).get('/api/search?q=searchable');
    expect(res.status).toBe(200);
    expect(res.body.communities[0].name).toBe('searchable');
    expect(res.body.posts.length).toBe(1);

    const suggest = await request(app).get('/api/search/suggest?q=search');
    expect(suggest.status).toBe(200);
    expect(suggest.body.communities[0].name).toBe('searchable');
  });
});

describe('Socket.IO chat', () => {
  it('authenticates the handshake, delivers messages in real time and rejects non-participants', async () => {
    const alice = await createUser('alice_chat');
    const bob = await createUser('bob_chat');
    const outsider = await createUser('outsider_chat');
    const conversation = await Conversation.create({
      participants: [alice._id, bob._id],
      dmKey: [String(alice._id), String(bob._id)].sort().join(':'),
    });

    const connect = (user) =>
      ioClient(baseUrl, { auth: { token: signAccessToken(user) }, transports: ['websocket'] });

    const aliceSocket = connect(alice);
    const bobSocket = connect(bob);
    const outsiderSocket = connect(outsider);

    await Promise.all(
      [aliceSocket, bobSocket, outsiderSocket].map(
        (socket) =>
          new Promise((resolve, reject) => {
            socket.once('connect', resolve);
            socket.once('connect_error', reject);
          }),
      ),
    );

    await new Promise((resolve, reject) =>
      aliceSocket.emit('conversation:join', { conversationId: String(conversation._id) }, (ack) =>
        ack.ok ? resolve() : reject(new Error(ack.error)),
      ),
    );
    await new Promise((resolve, reject) =>
      bobSocket.emit('conversation:join', { conversationId: String(conversation._id) }, (ack) =>
        ack.ok ? resolve() : reject(new Error(ack.error)),
      ),
    );

    const outsiderAck = await new Promise((resolve) =>
      outsiderSocket.emit('conversation:join', { conversationId: String(conversation._id) }, resolve),
    );
    expect(outsiderAck.ok).toBe(false);

    const received = new Promise((resolve) => bobSocket.once('message:new', resolve));
    const ack = await new Promise((resolve) =>
      aliceSocket.emit(
        'message:send',
        { conversationId: String(conversation._id), content: 'Hello over sockets', tempId: 'temp-1' },
        resolve,
      ),
    );
    expect(ack.ok).toBe(true);

    const payload = await received;
    expect(payload.message.content).toBe('Hello over sockets');
    expect(payload.tempId).toBe('temp-1');
    expect(await Message.countDocuments({ conversationId: conversation._id })).toBe(1);

    aliceSocket.close();
    bobSocket.close();
    outsiderSocket.close();
  });

  it('rejects unauthenticated socket connections', async () => {
    const socket = ioClient(baseUrl, { transports: ['websocket'], reconnection: false });
    const error = await new Promise((resolve) => {
      socket.once('connect_error', resolve);
      setTimeout(() => resolve(new Error('timeout')), 5000);
    });
    expect(error.message).toMatch(/Authentication required|Invalid/);
    socket.close();
  });
});
