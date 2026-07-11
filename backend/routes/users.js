'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const Post = require('../models/post.model');
const { protect } = require('../middleware/auth');

const router = express.Router();

const validateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
.withMessage('Display name must be at most 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 160 })
.withMessage('Bio must be at most 160 characters'),
  body('avatarUrl')
    .optional()
    .isURL().withMessage('avatarUrl must be a valid URL'),
];

router.patch('/me', protect, validateProfile, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const allowed = ['displayName', 'bio', 'avatarUrl'];
    const updates = Object.fromEntries(
      allowed
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]]),
    );
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true },
    );
    return res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:username', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const postCount = await Post.countDocuments({ author: user._id });
    return res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        postCount,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:username/posts', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 20);
    const skip = (page - 1) * limit;

    const [total, posts] = await Promise.all([
      Post.countDocuments({ author: user._id }),
      Post.find({ author: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username displayName avatarUrl'),
    ]);

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/:username/follow', protect, async (req, res, next) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username }).select('_id followers');
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (targetUser._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }
    const isFollowing = targetUser.followers.some(
      (followerId) => followerId.toString() === req.user.id,
    );
    if (isFollowing) {
      await User.updateOne({ _id: req.user.id }, { $pull: { following: targetUser._id } });
      await User.updateOne({ _id: targetUser._id }, { $pull: { followers: req.user.id } });
    } else {
      await User.updateOne({ _id: req.user.id }, { $addToSet: { following: targetUser._id } });
      await User.updateOne({ _id: targetUser._id }, { $addToSet: { followers: req.user.id } });
    }
    const updated = await User.findById(targetUser._id).select('followers');
    return res.json({
      success: true, following: !isFollowing, followerCount: updated.followers.length,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:username/followers', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('followers');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 20);
    const total = user.followers.length;
    const followerIds = user.followers.slice((page - 1) * limit, page * limit);
    const followers = await User.find({ _id: { $in: followerIds } })
      .select('username displayName avatarUrl');
    return res.json({
      success: true,
      data: followers,
      pagination: {
 page, limit, total, totalPages: Math.ceil(total / limit) || 1,
},
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:username/following', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('following');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 20);
    const total = user.following.length;
    const followingIds = user.following.slice((page - 1) * limit, page * limit);
    const following = await User.find({ _id: { $in: followingIds } })
      .select('username displayName avatarUrl');
    return res.json({
      success: true,
      data: following,
      pagination: {
 page, limit, total, totalPages: Math.ceil(total / limit) || 1,
},
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
