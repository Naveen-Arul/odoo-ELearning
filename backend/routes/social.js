/**
 * Social Features Routes - Chat, Connections, Study Rooms
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const StudyRoom = require('../models/StudyRoom');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { notifyUser } = require('../config/socket');

// ============================================
// PEER-TO-PEER CHAT
// ============================================

/**
 * @route   POST /api/social/messages/send
 * @desc    Send message to another user
 * @access  Private
 */
router.post('/messages/send', protect, asyncHandler(async (req, res) => {
    const { recipientId, content, type = 'text' } = req.body;

    const message = await Message.create({
        sender: req.user.id,
        recipient: recipientId,
        content,
        type
    });

    await message.populate(['sender', 'recipient'], 'name email');

    res.status(201).json({
        success: true,
        data: message
    });
}));

/**
 * @route   GET /api/social/messages/conversation/:userId
 * @desc    Get conversation with a user
 * @access  Private
 */
router.get('/messages/conversation/:userId', protect, asyncHandler(async (req, res) => {
    const messages = await Message.find({
        $or: [
            { sender: req.user.id, recipient: req.params.userId },
            { sender: req.params.userId, recipient: req.user.id }
        ],
        deletedBy: { $ne: req.user.id }
    })
        .sort({ createdAt: 1 })
        .populate('sender recipient', 'name email');

    // Mark messages as read
    await Message.updateMany(
        { sender: req.params.userId, recipient: req.user.id, read: false },
        { read: true, readAt: new Date() }
    );

    res.status(200).json({
        success: true,
        data: messages
    });
}));

/**
 * @route   GET /api/social/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/messages/unread-count', protect, asyncHandler(async (req, res) => {
    const count = await Message.countDocuments({
        recipient: req.user.id,
        read: false
    });

    res.status(200).json({
        success: true,
        data: { count }
    });
}));

// ============================================
// FRIEND REQUEST SYSTEM
// ============================================

/**
 * @route   POST /api/social/connect/request/:userId
 * @desc    Send a connection request
 * @access  Private
 */
router.post('/connect/request/:userId', protect, asyncHandler(async (req, res) => {
    if (req.params.userId === req.user.id) {
        throw new ApiError('Cannot connect with yourself', 400);
    }

    const existing = await Connection.findOne({
        $or: [
            { user: req.params.userId, follower: req.user.id },
            { user: req.user.id, follower: req.params.userId }
        ]
    });

    if (existing) {
        if (existing.status === 'accepted') throw new ApiError('Already connected', 400);
        if (existing.status === 'pending') throw new ApiError('Request already pending', 400);
    }

    // Create pending connection (user = receiver, follower = sender)
    const connection = await Connection.create({
        user: req.params.userId,
        follower: req.user.id,
        status: 'pending',
        type: 'friend'
    });

    // Notify user via Socket.IO
    notifyUser(req.params.userId, 'new_friend_request', {
        ...connection.toObject(),
        follower: { _id: req.user.id, name: req.user.name } // minimal sender info
    });

    // Send email to receiver
    const recipient = await User.findById(req.params.userId);
    if (recipient) {
        await emailService.sendEmail({
            to: recipient.email,
            subject: 'New Friend Request - SkillForge AI',
            html: `
                <h3>Hello ${recipient.name},</h3>
                <p><strong>${req.user.name}</strong> sent you a friend request on SkillForge AI.</p>
                <p>Log in to your account to accept or reject the request.</p>
                <a href="${process.env.CLIENT_URL}/chat" style="display:inline-block;padding:10px 20px;background:#6366f1;color:white;text-decoration:none;border-radius:5px;">View Request</a>
            `
        });
    }

    res.status(201).json({
        success: true,
        data: connection,
        message: 'Friend request sent'
    });
}));

/**
 * @route   PUT /api/social/connect/accept/:requestId
 * @desc    Accept a connection request
 * @access  Private
 */
router.put('/connect/accept/:requestId', protect, asyncHandler(async (req, res) => {
    const connection = await Connection.findById(req.params.requestId);

    if (!connection) {
        throw new ApiError('Request not found', 404);
    }

    // Ensure the current user is the one who received the request
    if (connection.user.toString() !== req.user.id) {
        throw new ApiError('Not authorized to accept this request', 403);
    }

    connection.status = 'accepted';
    await connection.save();

    // Send email to sender (follower)
    const sender = await User.findById(connection.follower);
    if (sender) {
        await emailService.sendEmail({
            to: sender.email,
            subject: 'Friend Request Accepted - SkillForge AI',
            html: `
                <h3>Good news!</h3>
                <p><strong>${req.user.name}</strong> accepted your friend request.</p>
                <p>You can now chat and collaborate with them.</p>
                <a href="${process.env.CLIENT_URL}/chat" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:5px;">Start Chat</a>
            `
        });
    }

    res.status(200).json({
        success: true,
        data: connection,
        message: 'Request accepted'
    });
}));

/**
 * @route   DELETE /api/social/connect/reject/:requestId
 * @desc    Reject/Cancel a connection request
 * @access  Private
 */
router.delete('/connect/reject/:requestId', protect, asyncHandler(async (req, res) => {
    const connection = await Connection.findById(req.params.requestId);

    if (!connection) {
        throw new ApiError('Request not found', 404);
    }

    // Allow both sender and receiver to cancel/reject
    if (connection.user.toString() !== req.user.id && connection.follower.toString() !== req.user.id) {
        throw new ApiError('Not authorized', 403);
    }

    await connection.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Request removed'
    });
}));

/**
 * @route   GET /api/social/connect/requests
 * @desc    Get pending friend requests
 * @access  Private
 */
router.get('/connect/requests', protect, asyncHandler(async (req, res) => {
    const requests = await Connection.find({
        user: req.user.id,
        status: 'pending'
    }).populate('follower', 'name email avatar');

    res.status(200).json({
        success: true,
        data: requests
    });
}));

/**
 * @route   GET /api/social/following
 * @desc    Get accepted friends/connections
 * @access  Private
 */
router.get('/following', protect, asyncHandler(async (req, res) => {
    // Find connections where user is either sender or receiver, and status is accepted
    const connections = await Connection.find({
        $or: [
            { follower: req.user.id, status: 'accepted' },
            { user: req.user.id, status: 'accepted' }
        ]
    })
        .populate('user', 'name email')
        .populate('follower', 'name email');

    // Extract the other person from the connection
    const friends = connections.map(c => {
        return c.follower._id.toString() === req.user.id ? c.user : c.follower;
    });

    res.status(200).json({
        success: true,
        data: friends
    });
}));

// ============================================
// USER DISCOVERY
// ============================================

/**
 * @route   GET /api/social/users/search
 * @desc    Search for users to connect with
 * @access  Private
 */
router.get('/users/search', protect, asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(200).json({ success: true, data: [] });
    }

    const users = await User.find({
        name: { $regex: q, $options: 'i' },
        _id: { $ne: req.user.id }
    }).select('name email avatar').limit(10);

    // Check connection status for each user
    const results = await Promise.all(users.map(async (user) => {
        const connection = await Connection.findOne({
            $or: [
                { user: user._id, follower: req.user.id },
                { user: req.user.id, follower: user._id }
            ]
        });

        let status = 'none';
        if (connection) {
            if (connection.status === 'accepted') status = 'accepted';
            else if (connection.status === 'pending') {
                status = connection.follower.toString() === req.user.id ? 'pending' : 'received';
            }
        }

        return { ...user.toObject(), connectionStatus: status, requestId: connection?._id };
    }));

    res.status(200).json({
        success: true,
        data: results
    });
}));

// ============================================
// GROUP STUDY ROOMS
// ============================================

/**
 * @route   POST /api/social/rooms/create
 * @desc    Create a study room
 * @access  Private
 */
router.post('/rooms/create', protect, asyncHandler(async (req, res) => {
    const { name, description, topicId, roadmapId, isPublic, maxMembers, targetRole } = req.body;

    // Generate a simple unique 6-char ID
    // Retry logic is ideal but for 6-char collisions are rare enough for MVP
    // We can use a loop if we want to be 100% sure but let's stick to simple first
    const generateRoomId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    let roomId = generateRoomId();
    // Simple collision check (optional extended logic could loop)
    let existing = await StudyRoom.findOne({ roomId });
    while (existing) {
        roomId = generateRoomId();
        existing = await StudyRoom.findOne({ roomId });
    }

    const room = await StudyRoom.create({
        name,
        description,
        creator: req.user.id,
        topic: topicId,
        roadmap: roadmapId,
        isPublic,
        maxMembers,
        roomId,
        targetRole: targetRole || 'All',
        members: [{
            user: req.user.id,
            role: 'owner'
        }]
    });

    await room.populate('creator', 'name email');

    res.status(201).json({
        success: true,
        data: room
    });
}));

/**
 * @route   GET /api/social/rooms
 * @desc    Get all public study rooms
 * @access  Private
 */
router.get('/rooms', protect, asyncHandler(async (req, res) => {
    const { targetRole } = req.query;

    let query = { status: 'active', isPublic: true };

    // Filter by target role if provided and not 'All'
    if (targetRole && targetRole !== 'All') {
        query.targetRole = { $in: [targetRole, 'All'] }; // Show specific role + All
    }

    const rooms = await StudyRoom.find(query)
        .populate('creator', 'name')
        .populate('members.user', 'name')
        .sort({ createdAt: -1 })
        .limit(50);

    res.status(200).json({
        success: true,
        data: rooms
    });
}));

/**
 * @route   GET /api/social/rooms/:id
 * @desc    Get single study room details
 * @access  Private
 */
router.get('/rooms/:id', protect, asyncHandler(async (req, res) => {
    const room = await StudyRoom.findById(req.params.id)
        .populate('creator', 'name email')
        .populate('members.user', 'name email topicProgress') // Populate user details
        .populate('messages.user', 'name');

    if (!room) {
        throw new ApiError('Room not found', 404);
    }

    res.status(200).json({
        success: true,
        data: room
    });
}));

/**
 * @route   POST /api/social/rooms/join-by-id
 * @desc    Join a study room using unique ID
 * @access  Private
 */
router.post('/rooms/join-by-id', protect, asyncHandler(async (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
        throw new ApiError('Room ID is required', 400);
    }

    const room = await StudyRoom.findOne({ roomId });

    if (!room) {
        throw new ApiError('Room not found', 404);
    }

    if (room.members.some(m => m.user.toString() === req.user.id)) {
        // Already a member, return the room info
        return res.status(200).json({
            success: true,
            data: room,
            message: 'Already a member'
        });
    }

    if (room.members.length >= room.maxMembers) {
        throw new ApiError('Room is full', 400);
    }

    room.members.push({ user: req.user.id, role: 'member' });
    await room.save();

    res.status(200).json({
        success: true,
        data: room
    });
}));

/**
 * @route   POST /api/social/rooms/:id/join
 * @desc    Join a study room
 * @access  Private
 */
router.post('/rooms/:id/join', protect, asyncHandler(async (req, res) => {
    const room = await StudyRoom.findById(req.params.id);

    if (!room) {
        throw new ApiError('Room not found', 404);
    }

    if (room.members.some(m => m.user.toString() === req.user.id)) {
        throw new ApiError('Already a member', 400);
    }

    if (room.members.length >= room.maxMembers) {
        throw new ApiError('Room is full', 400);
    }

    room.members.push({ user: req.user.id, role: 'member' });
    await room.save();

    res.status(200).json({
        success: true,
        data: room
    });
}));

/**
 * @route   POST /api/social/rooms/:id/leave
 * @desc    Leave a study room
 * @access  Private
 */
router.post('/rooms/:id/leave', protect, asyncHandler(async (req, res) => {
    const room = await StudyRoom.findById(req.params.id);

    if (!room) {
        throw new ApiError('Room not found', 404);
    }

    // Remove user from members
    room.members = room.members.filter(m => m.user.toString() !== req.user.id);

    await room.save();

    res.status(200).json({
        success: true,
        message: 'Left room successfully'
    });
}));

/**
 * @route   POST /api/social/rooms/:id/message
 * @desc    Send message in study room
 * @access  Private
 */
router.post('/rooms/:id/message', protect, asyncHandler(async (req, res) => {
    const { content } = req.body;

    const room = await StudyRoom.findById(req.params.id);

    if (!room) {
        throw new ApiError('Room not found', 404);
    }

    if (!room.members.some(m => m.user.toString() === req.user.id)) {
        throw new ApiError('Not a member of this room', 403);
    }

    room.messages.push({
        user: req.user.id,
        content
    });

    room.stats.totalMessages += 1;
    await room.save();

    res.status(201).json({
        success: true,
        data: room.messages[room.messages.length - 1]
    });
}));

/**
 * @route   PUT /api/social/rooms/:id/whiteboard
 * @desc    Update whiteboard data
 * @access  Private
 */
router.put('/rooms/:id/whiteboard', protect, asyncHandler(async (req, res) => {
    const { whiteboardData } = req.body;

    const room = await StudyRoom.findById(req.params.id);

    if (!room) {
        throw new ApiError('Room not found', 404);
    }

    if (!room.members.some(m => m.user.toString() === req.user.id)) {
        throw new ApiError('Not a member of this room', 403);
    }

    room.whiteboardData = whiteboardData;
    await room.save();

    res.status(200).json({
        success: true,
        data: room.whiteboardData
    });
}));

module.exports = router;
