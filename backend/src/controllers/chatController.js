import * as chatService from '../services/chatService.js';

function handleError(err, res, next) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
}

export async function createOrGetConversation(req, res, next) {
    try {
        const conversation = await chatService.createOrGetConversation({
            projectID: req.body?.projectID,
            requesterID: req.user.id,
        });
        return res.status(200).json({ conversation });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function getMyConversations(req, res, next) {
    try {
        const conversations = await chatService.getMyConversations(req.user.id);
        return res.status(200).json({ conversations });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function searchUsers(req, res, next) {
    try {
        const users = await chatService.searchUsers({
            requesterID: req.user.id,
            query: req.query.q,
        });
        return res.status(200).json({ users });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function createOrGetDirectConversation(req, res, next) {
    try {
        const conversation = await chatService.createOrGetDirectConversation({
            requesterID: req.user.id,
            receiverID: req.body?.receiverID,
        });
        return res.status(200).json({ conversation });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function getMessages(req, res, next) {
    try {
        const messages = await chatService.getConversationMessages({
            conversationID: req.params.id,
            userID: req.user.id,
            limit: req.query.limit,
            beforeID: req.query.beforeID,
        });
        return res.status(200).json({ messages });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function markConversationRead(req, res, next) {
    try {
        const result = await chatService.markAsRead({
            conversationID: req.params.id,
            userID: req.user.id,
        });
        return res.status(200).json({ message: 'Conversation marked as read.', ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
}
