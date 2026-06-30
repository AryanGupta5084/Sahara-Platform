const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const Chat = require('../models/Chat');
const { encrypt } = require('../utils/crypto');
const { translateText } = require('../utils/translate');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function analyzeSentiment(text) {
    try {
        const response = await axios.post(process.env.SENTIMENT_SERVICE_URL, { text });
        return response.data;
    } catch (error) {
        console.error('Sentiment analysis error:', error.message);
        return { emotion: 'neutral', confidence: 0, needs_immediate_help: false };
    }
}

function buildContextThread(chatHistory) {
    return chatHistory
        .map(({ message, response }) => `User: ${message}\nMindfulChat: ${response}`)
        .join('\n\n');
}

function isNewTopic(userMessage) {
    const resetTriggers = [
        "let's talk about something else",
        "new topic",
        "change subject",
        "different issue",
        "start fresh"
    ];
    const normalized = userMessage.toLowerCase();
    return resetTriggers.some(trigger => normalized.includes(trigger));
}

async function getGeminiResponse(userMessage, emotion, confidence, locale = 'en', historyContext = '') {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `You are Sahara, a mental health companion. The user's detected emotion is ${emotion}. \nContext:\n${historyContext}\nUser: ${userMessage}`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Gemini error:', error.message);
        return "I'm having trouble thinking right now. Please try again.";
    }
}

const sendMessage = async (req, res) => {
    const locale = req.locale || 'en';
    
    try {
        const { message } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, data: null, error: 'Message cannot be empty.' });
        }

        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount > 100) {
            return res.status(400).json({ success: false, data: null, error: 'Message cannot exceed 100 words.' });
        }

        const isGuest = req.user.isGuest || false;
        const userId = isGuest ? null : req.user._id;
        let sessionId = req.sessionId;
        let newToken = null;

        const translatedMessageResult = (locale === 'en') ? { success: true, text: message } : await translateText(message, 'en');

        if (!translatedMessageResult.success) {
            console.error('Translation to English failed for message:', message);
            return res.status(503).json({ success: false, data: null, error: 'Sorry, I am having trouble understanding that language right now. Please try again in English.' });
        }
        
        const translatedMessage = translatedMessageResult.text;
        const sentimentResult = await analyzeSentiment(translatedMessage);
        const newTopicDetected = isNewTopic(translatedMessage);

        if (newTopicDetected) {
            sessionId = uuidv4();
            newToken = jwt.sign(
                { id: req.user._id, sessionId: sessionId, isGuest: isGuest },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );
        }

        let historyContext = '';
        if (!newTopicDetected) {
            const historyFilter = { sessionId };
            if (!isGuest) {
                historyFilter.user = userId;
            }
            const pastChats = await Chat.find(historyFilter).sort({ createdAt: -1 }).limit(5);
            const recentHistory = pastChats.reverse().map(chat => ({ message: chat.message, response: chat.response }));
            historyContext = buildContextThread(recentHistory);
        }

        const aiResponseEnglish = await getGeminiResponse(translatedMessage, sentimentResult.emotion, sentimentResult.confidence, locale, historyContext);
        const finalResponseResult = (locale === 'en') ? { success: true, text: aiResponseEnglish } : await translateText(aiResponseEnglish, locale);
        const finalResponse = finalResponseResult.text;

        const chatData = {
            user: userId,
            isGuest,
            sessionId,
            originalMessage: encrypt(message),
            message: encrypt(translatedMessage),
            response: encrypt(finalResponse),
            sentiment: sentimentResult.emotion,
            confidence: sentimentResult.confidence,
            needs_immediate_help: sentimentResult.needs_immediate_help,
            flag: sentimentResult.needs_immediate_help ? 'suicidal' : null
        };

        if (isGuest) {
            chatData.expireAt = req.user.expireAt;
        }

        const chat = await Chat.create(chatData);

        res.status(200).json({
            success: true,
            data: {
                message,
                response: finalResponse,
                sentiment: chat.sentiment,
                confidence: chat.confidence,
                needs_immediate_help: chat.needs_immediate_help,
                timestamp: chat.createdAt,
                isGuest: chat.isGuest,
                sessionId: chat.sessionId,
                newToken: newToken
            },
            error: null
        });
    } catch (error) {
        console.error('Error in sendMessage:', error.message);
        const errorFallback = "Failed to process message due to a server error.";
        const translatedErrorResult = (locale === 'en') ? { text: errorFallback } : await translateText(errorFallback, locale);
        res.status(500).json({ success: false, data: null, error: translatedErrorResult.text });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const { _id: userId, isGuest } = req.user;
        const sessionId = req.query.sessionId || req.sessionId;
        let filter = {};

        if (isGuest) {
            filter = { sessionId: sessionId, isGuest: true };
        } else {
            filter = { user: userId, sessionId: sessionId };
        }
        
        const history = await Chat.find(filter).sort({ createdAt: 1 }).select('-__v');

        const decryptedHistory = history.map(chat => ({
            _id: chat._id,
            message: chat.originalMessage ? chat.originalMessage : chat.message,
            response: chat.response,
            sentiment: chat.sentiment,
            confidence: chat.confidence,
            needs_immediate_help: chat.needs_immediate_help,
            timestamp: chat.createdAt,
            sessionId: chat.sessionId
        }));

        res.status(200).json({ success: true, data: decryptedHistory, error: null });
    } catch (error) {
        console.error('Error in getChatHistory:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Failed to retrieve chat history.' });
    }
};

const deleteAllChats = async (req, res) => {
    try {
        const userId = req.user._id;
        await Chat.deleteMany({ user: userId });
        res.status(200).json({ success: true, data: { message: 'All chats deleted successfully.' }, error: null });
    } catch (error) {
        console.error('Error in deleteAllChats:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Failed to delete chats.' });
    }
};

const getChatSessions = async (req, res) => {
    try {
        const userId = req.user._id;
        const sessions = await Chat.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: "$sessionId",
                firstMessageDate: { $min: "$createdAt" }
            }},
            { $sort: { firstMessageDate: -1 } },
            { $project: {
                _id: 0,
                sessionId: "$_id",
                firstMessageDate: "$firstMessageDate"
            }}
        ]);
        res.status(200).json({ success: true, data: sessions, error: null });
    } catch (error) {
        console.error('Error in getChatSessions:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Failed to retrieve chat sessions.' });
    }
};

module.exports = { sendMessage, getChatHistory, deleteAllChats, getChatSessions };