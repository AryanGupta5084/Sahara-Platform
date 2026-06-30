const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LiveChatMessage = require('../models/LiveChatMessage');
const Appointment = require('../models/Appointment');
const Counselor = require('../models/Counselor');

module.exports = function(io) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                return next(new Error('User not found'));
            }
            
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        socket.on('joinSession', async ({ appointmentId }) => {
            try {
                const appointment = await Appointment.findById(appointmentId);
                if (!appointment) {
                    return socket.emit('connect_error', { message: 'Appointment not found' });
                }
                
                socket.join(appointmentId);
                
                const history = await LiveChatMessage.find({ appointment: appointmentId })
                    .populate('sender', 'username')
                    .sort({ createdAt: 1 });
                    
                socket.emit('loadHistory', history);
            } catch (error) {
                socket.emit('connect_error', { message: 'Failed to join session' });
            }
        });

        socket.on('sendMessage', async ({ appointmentId, message }) => {
            try {
                const newMsg = await LiveChatMessage.create({
                    appointment: appointmentId,
                    sender: socket.user._id,
                    message: message
                });
                
                const populatedMsg = await LiveChatMessage.findById(newMsg._id).populate('sender', 'username');
                
                socket.to(appointmentId).emit('receiveMessage', {
                    senderId: populatedMsg.sender._id,
                    senderUsername: populatedMsg.sender.username,
                    message: populatedMsg.message,
                    timestamp: populatedMsg.createdAt
                });
            } catch (error) {
                socket.emit('connect_error', { message: 'Failed to send message' });
            }
        });

        socket.on('disconnect', () => {});
    });
};