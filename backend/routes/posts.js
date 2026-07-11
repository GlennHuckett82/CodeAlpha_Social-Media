'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Post = require('../models/post.model');
const { protect } = require('../middleware/auth');

const router = express.Router();

const validatePost = [
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ max: 500 })
.withMessage('Content must be at most 500 characters'),
  body('imageUrl')
    .optional()
    .isURL().withMessage('imageUrl must be a valid URL'),
];

const validateComment = [
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ max: 280 })
.withMessage('Content must be at most 280 characters'),
];

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 20);
    const skip = (page - 1) * limit;

    const [total, posts] = await Promise.all([
      Post.countDocuments(),
      Post.find()
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

router.get('/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username displayName avatarUrl')
      .populate('comments.author', 'username avatarUrl');
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
});

router.post('/', protect, validatePost, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const { content, imageUrl } = req.body;
    const post = await Post.create({
      author: req.user.id,
      content,
      imageUrl: imageUrl || '',
    });
    return res.status(201).json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    if (req.user.id !== post.author.toString()) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    await post.deleteOne();
    return res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/comments', protect, validateComment, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    post.comments.push({ author: req.user.id, content: req.body.content });
    await post.save();
    await post.populate('comments.author', 'username avatarUrl');
    return res.status(201).json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id/comments/:commentId', protect, async (req, res, next) => {
  const { id, commentId } = req.params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(commentId)) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  try {
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    if (req.user.id !== comment.author.toString()) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    post.comments.pull({ _id: commentId });
    await post.save();
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/like', protect, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    const isLiked = post.likes.some((likeId) => likeId.toString() === req.user.id);
    if (isLiked) {
      post.likes.pull(req.user.id);
    } else {
      post.likes.push(req.user.id);
    }
    await post.save();
    return res.json({ success: true, liked: !isLiked, likeCount: post.likes.length });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
