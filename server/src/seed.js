/**
 * Demo data seeder.
 *   npm run seed              → idempotent seed (skips if demo data exists)
 *   npm run seed -- --reset   → wipes the database first (dev only)
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Community } from './models/Community.js';
import { Membership } from './models/Membership.js';
import { Post } from './models/Post.js';
import { Comment } from './models/Comment.js';
import { Vote } from './models/Vote.js';
import { Conversation } from './models/Conversation.js';
import { Message } from './models/Message.js';
import { Notification } from './models/Notification.js';
import { Report } from './models/Report.js';

const DEMO_USERS = [
  { username: 'alice_dev', displayName: 'Alice Chen', bio: 'Full-stack dev. Building things on the web since dial-up. r/webdev mod.', postKarma: 1842, commentKarma: 967 },
  { username: 'bob_builder', displayName: 'Bob Martinez', bio: 'Backend engineer, coffee-powered. Ask me about MongoDB transactions.', postKarma: 1203, commentKarma: 2210 },
  { username: 'carol_codes', displayName: 'Carol Okafor', bio: 'CS senior • campus life photographer • chronic side-project starter.', postKarma: 743, commentKarma: 1580 },
  { username: 'dave_designs', displayName: 'Dave Kim', bio: 'UI designer who cares about contrast ratios a little too much.', postKarma: 2210, commentKarma: 431 },
  { username: 'erin_editor', displayName: 'Erin Novak', bio: 'Science writer. I read the abstract so you do not have to.', postKarma: 1567, commentKarma: 892 },
  { username: 'frank_photo', displayName: 'Frank Liu', bio: 'Street photography, mechanical keyboards, cold brew.', postKarma: 388, commentKarma: 214 },
];

const COMMUNITIES = [
  {
    name: 'webdev',
    title: 'Web Development',
    description: 'A community for web developers: HTML, CSS, JavaScript, frameworks, accessibility and everything in between.',
    iconUrl: '',
    memberCountUsers: ['alice_dev', 'bob_builder', 'carol_codes', 'dave_designs', 'frank_photo'],
    moderator: 'alice_dev',
    rules: [
      { title: 'Be respectful', description: 'No personal attacks, harassment or gatekeeping.' },
      { title: 'No low-effort posts', description: 'Questions should include context, code and what you already tried.' },
      { title: 'No self-promotion spam', description: 'Share your work in Showcase threads; disclose affiliations.' },
      { title: 'Use descriptive titles', description: 'Say what you need help with, not "help pls".' },
    ],
    flairs: [
      { label: 'Discussion', color: '#FF4500' },
      { label: 'Help', color: '#7193FF' },
      { label: 'Showcase', color: '#46D160' },
      { label: 'News', color: '#FFB000' },
    ],
  },
  {
    name: 'programming',
    title: 'Programming',
    description: 'Computer programming: languages, algorithms, tooling and career talk. Beginners welcome.',
    iconUrl: '',
    memberCountUsers: ['alice_dev', 'bob_builder', 'carol_codes', 'erin_editor'],
    moderator: 'alice_dev',
    rules: [
      { title: 'Stay on topic', description: 'Posts must be about programming or software engineering.' },
      { title: 'No homework dumps', description: 'Show your attempt and ask a specific question.' },
    ],
    flairs: [
      { label: 'Discussion', color: '#FF4500' },
      { label: 'Career', color: '#7193FF' },
      { label: 'Article', color: '#FFB000' },
    ],
  },
  {
    name: 'gaming',
    title: 'Gaming',
    description: 'News, reviews and screenshots from every platform. Be excellent to each other.',
    iconUrl: '',
    memberCountUsers: ['bob_builder', 'dave_designs', 'frank_photo', 'carol_codes'],
    moderator: 'bob_builder',
    rules: [
      { title: 'No spoilers in titles', description: 'Tag spoilers and keep them out of post titles.' },
      { title: 'No piracy', description: 'Do not link to pirated games or keys.' },
    ],
    flairs: [
      { label: 'News', color: '#FFB000' },
      { label: 'Review', color: '#46D160' },
      { label: 'Screenshot', color: '#7193FF' },
    ],
  },
  {
    name: 'campuslife',
    title: 'Campus Life',
    description: 'Dorm hacks, study spots, club events and the occasional 2am dining hall story.',
    iconUrl: '',
    memberCountUsers: ['carol_codes', 'alice_dev', 'erin_editor', 'frank_photo'],
    moderator: 'carol_codes',
    rules: [
      { title: 'No doxxing', description: 'Never post names, room numbers or schedules of other students.' },
      { title: 'Keep events accurate', description: 'Include date, time and location for club events.' },
    ],
    flairs: [
      { label: 'Event', color: '#FFB000' },
      { label: 'Advice', color: '#7193FF' },
      { label: 'Photo', color: '#46D160' },
    ],
  },
  {
    name: 'movies',
    title: 'Movies',
    description: 'Film discussion, trailers and hot takes. Letterboxd links welcome.',
    iconUrl: '',
    memberCountUsers: ['dave_designs', 'alice_dev', 'bob_builder'],
    moderator: 'dave_designs',
    rules: [
      { title: 'Tag spoilers', description: 'Use the spoiler tag and warn before major plot points.' },
      { title: 'No piracy links', description: 'Discuss films, do not link to illegal streams.' },
    ],
    flairs: [
      { label: 'Discussion', color: '#FF4500' },
      { label: 'Trailer', color: '#7193FF' },
      { label: 'Review', color: '#46D160' },
    ],
  },
  {
    name: 'science',
    title: 'Science',
    description: 'Peer-reviewed research, explainers and curious questions. Cite your sources.',
    iconUrl: '',
    memberCountUsers: ['erin_editor', 'carol_codes', 'alice_dev'],
    moderator: 'erin_editor',
    rules: [
      { title: 'Cite sources', description: 'Link the paper or a reputable outlet, not a screenshot.' },
      { title: 'No medical advice', description: 'Talk to a clinician; anecdote is not evidence.' },
    ],
    flairs: [
      { label: 'Research', color: '#46D160' },
      { label: 'Explainer', color: '#7193FF' },
    ],
  },
];

const POSTS = [
  {
    community: 'webdev',
    author: 'alice_dev',
    title: 'What actually happens when two users upvote the same post at the same time?',
    type: 'text',
    flair: 'Discussion',
    body: `We spent the last week rebuilding our voting endpoint for this project and the race conditions were eye-opening. The naive approach reads the post score, adds one in application code and saves the whole document back. Under load, two requests read the same score, both write score + 1, and one of the updates disappears.

The fix has three parts. First, keep votes in their own collection with a unique compound index on user, target and target type, so the database itself refuses a second active vote from the same user. Second, wrap the vote write plus the score update in a multi-document transaction. Third, use an atomic $inc instead of read-modify-write, and retry the transaction when MongoDB reports a write conflict or duplicate key.

We also learned that transactions require a replica set, which is why our local database now starts with --replSet and why Atlas works out of the box. The stress test fires twenty concurrent vote changes from one account and fifty concurrent upvotes from different accounts; the score always equals the sum of the vote documents afterwards. Curious how other teams handled idempotency for retried requests.`,
  },
  {
    community: 'webdev',
    author: 'dave_designs',
    title: 'Reddit’s light theme is not just white — a small teardown of its colour system',
    type: 'text',
    flair: 'Discussion',
    body: `People describe Reddit's light theme as "white with an orange button", but there is a lot more structure. The page background sits a step darker than the cards, borders are cool grey rather than neutral, and the upvote orange is used sparingly so it keeps its meaning. Text hierarchy relies on three or four greys, not a full rainbow.

For our clone I mapped the system to CSS variables: page, surface, elevated surface, border, primary text, secondary text, hover and accent. Dark mode is not an inversion; the page gets darker than the cards, and the accent stays saturated so votes still read clearly. The other detail that matters is the rounded pill around the vote arrows. It groups the three controls into one target and makes the whole row feel like a single component.

If you are matching a reference UI, screenshot it in both themes before writing any CSS. Half the "off" feeling in student projects comes from using pure black text on pure white cards.`,
  },
  {
    community: 'webdev',
    author: 'frank_photo',
    title: 'I rebuilt my portfolio with zero JavaScript and it loads in 300ms',
    type: 'link',
    flair: 'Showcase',
    linkUrl: 'https://example.com/portfolio-case-study',
    body: 'Wrote up the whole process: semantic HTML, one stylesheet, system fonts, and a tiny build step. Happy to answer questions about the tradeoffs.',
  },
  {
    community: 'programming',
    author: 'bob_builder',
    title: 'The best debugging tool is still a well-placed console.log',
    type: 'text',
    flair: 'Discussion',
    body: `Every few months I convince myself I need a heavier debugging setup, and every time I end up back at console.log. The reason is not nostalgia. A log statement is the cheapest way to test a hypothesis about what the code actually does, and it leaves a trail you can read in order when the flow is asynchronous.

That said, there is a skill to it. Log the values that distinguish between your competing theories, not every variable in scope. Give each log a label you can grep. Delete them before review. And when the bug is a mutation happening somewhere unexpected, switch to a debugger or a breakpoint so you can inspect the call stack.

The habit I wish I had formed earlier is writing down the hypothesis before adding the log. It turns random printf debugging into an actual experiment.`,
  },
  {
    community: 'programming',
    author: 'alice_dev',
    title: 'Mongoose transactions: five gotchas we hit in production-ish conditions',
    type: 'text',
    flair: 'Article',
    body: `Transactions in Mongoose look simple until they are not. Gotcha one: every operation inside withTransaction must receive the same session. Forget one and it runs outside the transaction, which is worse than not using a transaction at all.

Gotcha two: startSession must be ended in a finally block, or the connection pool slowly starves. Gotcha three: write conflicts are normal under concurrency; retry with jitter instead of surfacing a 500. Gotcha four: unique indexes are your friend, but a duplicate key error inside a transaction aborts the whole thing, so catch it deliberately.

Gotcha five: tests need a replica set, not a standalone mongod. mongodb-memory-server can start one for CI, which made our concurrency suite reproducible on every laptop.`,
  },
  {
    community: 'gaming',
    author: 'bob_builder',
    title: 'What is the most replayable game you own?',
    type: 'text',
    flair: 'Discussion',
    body: `I keep reinstalling the same three games every year and I am looking for something with real replay value. Not necessarily long — I want the kind of game where a second run feels different because the systems interact in new ways. Roguelikes count, strategy games count, and so do games with genuinely different builds.

For me it is Slay the Spire: the card pool, relics and path choices make every run a new puzzle, and a run is short enough to fit between lectures. A close second is a certain open-world game I have finished four times, which is less about replayability and more about comfort food.

Tell me what you keep coming back to and why the loop still works for you.`,
  },
  {
    community: 'gaming',
    author: 'frank_photo',
    title: 'Sunset over the starting zone — still the best view in the game',
    type: 'image',
    flair: 'Screenshot',
    mediaUrl: 'https://picsum.photos/seed/reddit-gaming/1000/560',
    body: 'No filters, just waited for the in-game clock to hit golden hour.',
  },
  {
    community: 'campuslife',
    author: 'carol_codes',
    title: 'The library’s third floor is the only quiet study spot left — here’s a map',
    type: 'text',
    flair: 'Advice',
    body: `After two weeks of wandering between buildings with a laptop, I mapped the study spots that actually work during midterms. Third floor of the main library: silent, outlets along the west wall, and the wifi holds up. Second floor: group tables, louder, but the couches are better for reading.

The engineering building atrium is great before 10am and unusable after lunch. The student union has the best coffee but the worst background noise. If you need a room for a project meeting, book the small rooms in the basement at least a day ahead; they disappear fast.

I put the whole thing in a shared doc with photos of the outlet locations. Drop a comment if your favourite spot is missing and I will add it.`,
  },
  {
    community: 'campuslife',
    author: 'alice_dev',
    title: 'Hackathon this weekend: three teammates needed, beginners welcome',
    type: 'text',
    flair: 'Event',
    body: `We are forming a team for the 36-hour campus hackathon starting Saturday at 9am in the engineering building. Our idea is a study-group matcher for large intro courses: students enter a course code and availability, and the app suggests groups.

We need someone comfortable with React and someone who can handle the Express API. A designer would be amazing because the current mockup is three rectangles and a prayer. Beginners are genuinely welcome; the point is to ship something small and learn the deployment pipeline.

Comment or send a chat message if you are interested. We will meet Thursday at 6pm to scope it down to something finishable.`,
  },
  {
    community: 'movies',
    author: 'dave_designs',
    title: 'The editing in that one-take hallway scene deserves its own award',
    type: 'text',
    flair: 'Discussion',
    body: `I rewatched the hallway scene last night and paid attention to the transitions instead of the plot. The camera never cuts, but the lighting changes three times to signal the passage of time, and the background actors are choreographed so the frame always has a clear path.

What makes it work is restraint. A lesser film would add a dramatic score and a slow-motion moment. Here the sound drops out completely for eight seconds and the silence does more work than any music cue could.

Spoiler-free recommendation: watch it twice, once for the story and once for the blocking. It is a masterclass in making a complicated shot look effortless.`,
  },
  {
    community: 'movies',
    author: 'erin_editor',
    title: 'Why practical effects still read as more “real” on screen',
    type: 'text',
    flair: 'Discussion',
    body: `There is a reason audiences can often tell practical effects from CGI even when the CGI is technically flawless. Part of it is lighting: real objects bounce light in ways that are expensive to simulate. Part of it is imperfection. A physical prop has weight, scratches and slight asymmetry that our brains read as authentic.

The interesting shift is that the best modern films mix the two. A practical base gives the actors something to react to, and digital cleanup removes the wires. Neither tool is inherently better; the failure mode is using CGI to skip the part where the scene has to obey physical rules.

I would love recommendations for films that use miniatures or animatronics in ways that still hold up.`,
  },
  {
    community: 'science',
    author: 'erin_editor',
    title: 'A new study on sleep and memory consolidation, explained without the jargon',
    type: 'link',
    flair: 'Research',
    linkUrl: 'https://example.com/sleep-memory-study',
    body: `The short version: participants who slept after learning a list of word pairs recalled significantly more the next day than those who stayed awake, and the effect was strongest for the pairs they had rated as difficult. The proposed mechanism is replay during slow-wave sleep.

Caveats matter here. The sample was small, the task is artificial, and "sleep improves memory" is not a licence to pull all-nighters before exams. Still, the difficult-item result is interesting because it suggests sleep preferentially stabilises material that has not yet been mastered.

Link to the paper in the post. I am happy to answer questions about the methods section.`,
  },
  {
    community: 'science',
    author: 'carol_codes',
    title: 'What’s a science fact you learned recently that broke your brain a little?',
    type: 'text',
    flair: 'Explainer',
    body: `Mine: a teaspoon of neutron star material would weigh roughly a billion tonnes on Earth. I understand the words individually and none of them together. The explanation involving degenerate matter and gravity makes sense on paper, but the number refuses to become intuitive.

I like these facts because they expose where human intuition stops scaling. We are good at estimating things at human size and speed, and terrible at extremes. The same problem shows up when people reason about probabilities or geological time.

Share the fact that did it for you, and if you know the mechanism, explain it like I am a curious first-year.`,
  },
];

const COMMENT_THREADS = {
  0: [
    {
      author: 'bob_builder',
      body: 'The retry loop is the part people skip. Even with the unique index, two simultaneous inserts can both pass the initial read and one will throw a duplicate key. Catching that and retrying is not optional.',
      replies: [
        { author: 'alice_dev', body: 'Exactly. We treat duplicate key as a signal to re-read the existing vote and compute the delta, not as a user-facing 409.' },
        { author: 'carol_codes', body: 'Do you use jittered backoff or a fixed delay? We had a thundering herd problem in a lab exercise once.' },
      ],
    },
    {
      author: 'dave_designs',
      body: 'From the UI side, optimistic updates make this much smoother, but you have to reconcile with the server response or the score drifts when a request fails.',
      replies: [
        { author: 'alice_dev', body: 'We roll back on error and refetch the post. It is boring but reliable.' },
      ],
    },
  ],
  1: [
    {
      author: 'alice_dev',
      body: 'The point about borders being cool grey is so true. Pure #ccc borders look muddy next to the warm orange accent.',
      replies: [
        { author: 'dave_designs', body: 'Yes — ours are a desaturated blue-grey and it instantly feels closer to the real thing.' },
      ],
    },
    {
      author: 'frank_photo',
      body: 'Screenshotting both themes first is the advice I needed two weeks ago. I built dark mode last and had to redo half the components.',
    },
  ],
  2: [
    {
      author: 'bob_builder',
      body: 'Zero JS portfolios are a great constraint. Did you miss client-side routing at all, or was multi-page fine?',
      replies: [
        { author: 'frank_photo', body: 'Multi-page was fine. The only thing I missed was a fancy lightbox, so I used the native dialog element.' },
      ],
    },
  ],
  5: [
    {
      author: 'carol_codes',
      body: 'Slay the Spire is the correct answer. The daily runs alone justify the install.',
      replies: [
        { author: 'dave_designs', body: 'I bounced off it twice before it clicked. The third run is when the relic synergies finally made sense.' },
      ],
    },
    {
      author: 'frank_photo',
      body: 'Mine is a racing game I have owned since 2014. The physics still feel better than most modern releases.',
    },
  ],
  7: [
    {
      author: 'erin_editor',
      body: 'The west wall outlets are a public service. Adding a pin for the science library reading room.',
      replies: [
        { author: 'carol_codes', body: 'Please do — I have never actually been inside there.' },
      ],
    },
  ],
};

async function seed({ reset = false } = {}) {
  if (reset) {
    if (env.isProduction) throw new Error('Refusing to reset a production database');
    await Promise.all([
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Vote.deleteMany({}),
      Membership.deleteMany({}),
      Community.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
      Report.deleteMany({}),
      User.deleteMany({}),
    ]);
    console.log('[seed] database cleared');
  }

  const existing = await Community.findOne({ name: 'webdev' }).select('_id');
  if (existing) {
    const count = await Post.countDocuments({ communityId: existing._id });
    if (count > 0) {
      console.log('[seed] demo data already present — skipping (use --reset to rebuild)');
      return;
    }
  }

  const passwordHash = await bcrypt.hash(env.seedPassword, 12);
  const users = {};
  for (const demo of DEMO_USERS) {
    const user = await User.create({
      username: demo.username,
      email: `${demo.username}@demo.local`,
      passwordHash,
      displayName: demo.displayName,
      bio: demo.bio,
      postKarma: demo.postKarma,
      commentKarma: demo.commentKarma,
    });
    users[demo.username] = user;
  }
  console.log(`[seed] ${Object.keys(users).length} users`);

  const communities = {};
  for (const demo of COMMUNITIES) {
    const community = await Community.create({
      name: demo.name,
      title: demo.title,
      description: demo.description,
      iconUrl: demo.iconUrl,
      creatorId: users[demo.moderator]._id,
      moderators: [users[demo.moderator]._id],
      rules: demo.rules,
      flairs: demo.flairs,
      memberCount: demo.memberCountUsers.length,
    });
    communities[demo.name] = community;
    await Membership.insertMany(
      demo.memberCountUsers.map((username) => ({
        userId: users[username]._id,
        communityId: community._id,
      })),
    );
  }
  console.log(`[seed] ${Object.keys(communities).length} communities`);

  const posts = [];
  for (const demo of POSTS) {
    const post = await Post.create({
      title: demo.title,
      type: demo.type,
      body: demo.body || '',
      mediaUrl: demo.mediaUrl || '',
      linkUrl: demo.linkUrl || '',
      flair: { label: demo.flair, color: '#' + (demo.flair === 'Help' ? '7193FF' : demo.flair === 'Showcase' ? '46D160' : 'FF4500') },
      authorId: users[demo.author]._id,
      communityId: communities[demo.community]._id,
      createdAt: new Date(Date.now() - (POSTS.indexOf(demo) + 1) * 3 * 60 * 60 * 1000),
    });
    posts.push(post);
  }

  // Votes first, then scores derived from them so seed data is internally consistent.
  for (const [index, post] of posts.entries()) {
    const voterNames = Object.keys(users).filter((username) => username !== POSTS[index].author);
    const votes = voterNames
      .slice(0, 2 + (index % 4))
      .map((username) => ({
        userId: users[username]._id,
        targetId: post._id,
        targetType: 'post',
        value: index % 3 === 0 ? -1 : 1,
      }));
    if (votes.length) await Vote.insertMany(votes);
    const score = votes.reduce((sum, vote) => sum + vote.value, 0);
    await Post.updateOne({ _id: post._id }, { $set: { score } });
  }
  console.log(`[seed] ${posts.length} posts`);

  for (const [postIndex, threads] of Object.entries(COMMENT_THREADS)) {
    const post = posts[Number(postIndex)];
    if (!post) continue;
    let commentCount = 0;

    for (const thread of threads) {
      const top = await Comment.create({
        postId: post._id,
        authorId: users[thread.author]._id,
        body: thread.body,
        depth: 0,
      });
      commentCount += 1;
      await Vote.create({
        userId: users[POSTS[Number(postIndex)].author]._id,
        targetId: top._id,
        targetType: 'comment',
        value: 1,
      });
      await Comment.updateOne({ _id: top._id }, { $set: { score: 1 } });

      for (const [replyIndex, reply] of (thread.replies || []).entries()) {
        const child = await Comment.create({
          postId: post._id,
          authorId: users[reply.author]._id,
          parentCommentId: top._id,
          ancestors: [top._id],
          depth: 1,
          body: reply.body,
        });
        commentCount += 1;
        if (replyIndex === 0) {
          await Vote.create({
            userId: users[thread.author]._id,
            targetId: child._id,
            targetType: 'comment',
            value: 1,
          });
          await Comment.updateOne({ _id: child._id }, { $set: { score: 1 } });
        }
      }
    }

    await Post.updateOne({ _id: post._id }, { $set: { commentCount } });
  }

  const dm = await Conversation.create({
    participants: [users.alice_dev._id, users.bob_builder._id],
    dmKey: [String(users.alice_dev._id), String(users.bob_builder._id)].sort().join(':'),
    lastMessage: { text: 'No worries — see you at the demo!', senderId: users.bob_builder._id, createdAt: new Date() },
  });
  await Message.insertMany([
    { conversationId: dm._id, senderId: users.alice_dev._id, content: 'Hey! Did you get the vote transaction test passing on your machine?', readBy: [users.alice_dev._id, users.bob_builder._id] },
    { conversationId: dm._id, senderId: users.bob_builder._id, content: 'Yes — the duplicate key retry was the missing piece. 50 concurrent upvotes, zero drift.', readBy: [users.bob_builder._id] },
    { conversationId: dm._id, senderId: users.alice_dev._id, content: 'Amazing. Can you walk through it at the Week 15 discussion?', readBy: [users.alice_dev._id] },
    { conversationId: dm._id, senderId: users.bob_builder._id, content: 'No worries — see you at the demo!', readBy: [] },
  ]);

  const group = await Conversation.create({
    participants: [users.alice_dev._id, users.bob_builder._id, users.carol_codes._id],
    isGroup: true,
    title: 'Hackathon Team',
    lastMessage: { text: 'I booked the 6pm room in the engineering basement.', senderId: users.carol_codes._id, createdAt: new Date() },
  });
  await Message.insertMany([
    { conversationId: group._id, senderId: users.carol_codes._id, content: 'I booked the 6pm room in the engineering basement.', readBy: [] },
    { conversationId: group._id, senderId: users.alice_dev._id, content: 'Perfect. I will bring the API sketch.', readBy: [] },
  ]);

  await Notification.insertMany([
    {
      recipientId: users.alice_dev._id,
      actorId: users.bob_builder._id,
      type: 'comment_reply',
      message: 'bob_builder replied to your comment',
      link: `/r/webdev/comments/${posts[0]._id}`,
      postId: posts[0]._id,
    },
    {
      recipientId: users.alice_dev._id,
      actorId: users.dave_designs._id,
      type: 'post_reply',
      message: 'dave_designs commented on your post',
      link: `/r/webdev/comments/${posts[0]._id}`,
      postId: posts[0]._id,
      isRead: true,
    },
    {
      recipientId: users.alice_dev._id,
      actorId: users.bob_builder._id,
      type: 'chat',
      message: 'bob_builder sent you a message',
      link: `/chat?c=${dm._id}`,
      isRead: true,
    },
  ]);

  console.log('[seed] chat + notifications');
  console.log(`\nDemo accounts (password: ${env.seedPassword}):`);
  for (const demo of DEMO_USERS) console.log(`  u/${demo.username}`);
}

const reset = process.argv.includes('--reset');

connectDatabase()
  .then(() => seed({ reset }))
  .then(() => disconnectDatabase())
  .then(() => {
    console.log('[seed] done');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[seed] failed:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
