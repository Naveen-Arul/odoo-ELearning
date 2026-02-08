const socketIO = require('socket.io');

let io;
const userSockets = new Map(); // userId -> socketId

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        // Register User for direct messages/notifications
        socket.on('register-user', (userId) => {
            userSockets.set(userId, socket.id);
            console.log(`👤 User ${userId} registered on socket ${socket.id}`);
        });

        // Join Study Room
        socket.on('join-room', (roomId) => {
            socket.join(roomId);
            console.log(`👤 User ${socket.id} joined room ${roomId}`);
        });

        // Leave Study Room
        socket.on('leave-room', (roomId) => {
            socket.leave(roomId);
            console.log(`👤 User ${socket.id} left room ${roomId}`);
        });

        // Whiteboard Drawing Data
        socket.on('draw-data', ({ roomId, data }) => {
            // Broadcast to everyone else in the room
            socket.to(roomId).emit('draw-data', data);
        });

        // Chat Messages
        socket.on('send-message', ({ roomId, message, user }) => {
            io.to(roomId).emit('new-message', {
                user,
                content: message,
                timestamp: new Date()
            });
        });

        // ===========================
        // Voice Chat Signaling (Mesh)
        // ===========================

        // User wants to join voice
        socket.on('join-voice', ({ roomId, user }) => {
            // Notify others to initiate connection request to this user
            socket.to(roomId).emit('user-joined-voice', { socketId: socket.id, user });
            console.log(`🎤 User ${socket.id} joined voice in room ${roomId}`);
        });

        // Leaving voice
        socket.on('leave-voice', ({ roomId }) => {
            socket.to(roomId).emit('user-left-voice', socket.id);
            console.log(`🔇 User ${socket.id} left voice in room ${roomId}`);
        });

        // WebRTC Signaling
        socket.on('offer', ({ target, sdp }) => {
            io.to(target).emit('offer', { sdp, caller: socket.id });
        });

        socket.on('answer', ({ target, sdp }) => {
            io.to(target).emit('answer', { sdp, caller: socket.id });
        });

        socket.on('ice-candidate', ({ target, candidate }) => {
            io.to(target).emit('ice-candidate', { candidate, caller: socket.id });
        });

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
            // Remove user from map
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

const notifyUser = (userId, event, data) => {
    const socketId = userSockets.get(userId.toString());
    if (socketId && io) {
        io.to(socketId).emit(event, data);
        return true;
    }
    return false;
};

module.exports = {
    initializeSocket,
    getIO,
    notifyUser
};
