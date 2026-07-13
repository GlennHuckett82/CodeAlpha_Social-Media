'use strict';

/* eslint-disable no-console */

/**
 * backend/server.e2e.js — Dev seed script
 *
 * Connects to MongoDB, wipes existing data, inserts seed users / posts /
 * comments / likes / follows, then starts the Express server.
 *
 * Usage:  npm run dev:seed
 * Login:  any seed username, password: password123
 */

require('dotenv').config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'e2e-dev-secret';
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user.model');
const Post = require('./models/post.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alpha-chat';
const PORT = process.env.PORT || 3001;

// ── Seed definitions ──────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    username: 'alice',
    displayName: 'Alice Smith',
    bio: 'Frontend developer 👩‍💻',
    email: 'alice@example.com',
  },
  {
    username: 'bob',
    displayName: 'Bob Jones',
    bio: 'Coffee & code ☕',
    email: 'bob@example.com',
  },
  {
    username: 'carol',
    displayName: 'Carol White',
    bio: 'Designer & maker 🎨',
    email: 'carol@example.com',
  },
  {
    username: 'dave',
    displayName: 'Dave Brown',
    bio: 'Backend engineer 🛠️',
    email: 'dave@example.com',
  },
  {
    username: 'eve',
    displayName: 'Eve Davis',
    bio: 'Open source contributor 🌍',
    email: 'eve@example.com',
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.info('[dev:seed] Connected to MongoDB.');

  await User.deleteMany({});
  await Post.deleteMany({});
  console.info('[dev:seed] Cleared existing data.');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await User.insertMany(
    SEED_USERS.map((u) => ({ ...u, password: hashedPassword })),
  );

  const [alice, bob, carol, dave, eve] = users;
  console.info(`[dev:seed] Created ${users.length} users.`);

  // ── Posts (with inline likes & comments) ────────────────────────────────
  const posts = await Post.insertMany([
    {
      author: alice._id,
      content: 'Just shipped my first open-source component library! 🎉 Check it out on GitHub.',
      likes: [bob._id, carol._id, eve._id],
      comments: [
        { author: bob._id, content: 'Congrats! I\'ll star it right now 🌟' },
        { author: carol._id, content: 'Amazing work! The docs look really clean.' },
      ],
    },
    {
      author: alice._id,
      content: 'Hot take: CSS Grid is better than Flexbox for 2D layouts. Change my mind 😄',
      likes: [bob._id],
    },
    {
      author: bob._id,
      content: 'Three cups of coffee and the bug is still there. Time for a fourth ☕',
      likes: [alice._id, dave._id],
      comments: [
        { author: alice._id, content: 'Ha! I\'ve been there. Solidarity ☕' },
      ],
    },
    {
      author: bob._id,
      content: 'Finished reading "Clean Code". Every developer should read it at least once.',
      likes: [dave._id, eve._id],
    },
    {
      author: carol._id,
      content: 'New design system drop 🎨 Spent two weeks on the colour palette. Worth every minute.',
      likes: [alice._id, dave._id, eve._id],
      comments: [
        { author: alice._id, content: 'The colour palette looks stunning! 😍' },
        { author: eve._id, content: 'Would love to contribute to this!' },
      ],
    },
    {
      author: carol._id,
      content: 'Accessibility isn\'t an afterthought — it\'s the foundation. Design for everyone.',
      likes: [alice._id, eve._id],
    },
    {
      author: dave._id,
      content: 'Migrated our API to Express 5 today. Performance gains are real.',
      likes: [alice._id, bob._id],
      comments: [
        { author: bob._id, content: 'Which breaking changes tripped you up most?' },
      ],
    },
    {
      author: dave._id,
      content: 'Reminder: index your MongoDB queries. A missing index took our p95 from 2ms to 800ms.',
      likes: [alice._id, carol._id, eve._id],
    },
    {
      author: eve._id,
      content: 'Just got my first open-source PR merged! 🌍 Small fix, but it feels huge.',
      likes: [alice._id, bob._id, carol._id, dave._id],
      comments: [
        { author: alice._id, content: 'The first one is always the best feeling 🎉' },
        { author: carol._id, content: 'Welcome to the club! 🙌' },
      ],
    },
    {
      author: eve._id,
      content: 'Good tests save hours of debugging. Write them first, thank yourself later.',
      likes: [dave._id],
    },
  ]);
  console.info(`[dev:seed] Created ${posts.length} posts with likes & comments.`);

  // ── Follow relationships ──────────────────────────────────────────────────
  // alice → bob, carol  |  bob → alice, dave  |  carol → alice, eve
  // dave → carol, eve   |  eve → alice, bob
  await Promise.all([
    User.updateOne({ _id: alice._id }, { $set: { following: [bob._id, carol._id] } }),
    User.updateOne({ _id: bob._id }, { $set: { following: [alice._id, dave._id] } }),
    User.updateOne({ _id: carol._id }, { $set: { following: [alice._id, eve._id] } }),
    User.updateOne({ _id: dave._id }, { $set: { following: [carol._id, eve._id] } }),
    User.updateOne({ _id: eve._id }, { $set: { following: [alice._id, bob._id] } }),

    // Corresponding followers arrays
    User.updateOne({ _id: alice._id }, { $set: { followers: [bob._id, carol._id, eve._id] } }),
    User.updateOne({ _id: bob._id }, { $set: { followers: [alice._id, eve._id] } }),
    User.updateOne({ _id: carol._id }, { $set: { followers: [alice._id, dave._id] } }),
    User.updateOne({ _id: dave._id }, { $set: { followers: [bob._id] } }),
    User.updateOne({ _id: eve._id }, { $set: { followers: [carol._id, dave._id] } }),
  ]);
  console.info('[dev:seed] Set up follow relationships.');

  // Disconnect so server.js can establish its own clean connection
  await mongoose.disconnect();
  console.info('[dev:seed] Seed complete.');
}

seed()
  .then(() => {
    // Require app AFTER disconnecting so server.js connects fresh
    const app = require('./server');
    app.listen(PORT, () => {
      console.info(`[dev:seed] Server ready — open http://localhost:${PORT} in Chrome`);
    });
  })
  .catch((err) => {
    console.error('[dev:seed] Seed failed:', err.message);
    process.exit(1);
  });
