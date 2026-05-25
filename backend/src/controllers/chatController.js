import * as chatService from '../services/chatService.js';
import {
    validatedBody,
    validatedParams,
    validatedQuery,
} from '../middleware/validateRequest.js';

function handleError(err, res, next) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
}

export async function createOrGetConversation(req, res, next) {
    try {
        const { projectID } = validatedBody(req);
        const conversation = await chatService.createOrGetConversation({
            projectID,
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
        const { q } = validatedQuery(req);
        const users = await chatService.searchUsers({
            requesterID: req.user.id,
            query: q,
        });
        return res.status(200).json({ users });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function createOrGetDirectConversation(req, res, next) {
    try {
        const { receiverID } = validatedBody(req);
        const conversation = await chatService.createOrGetDirectConversation({
            requesterID: req.user.id,
            receiverID,
        });
        return res.status(200).json({ conversation });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function getMessages(req, res, next) {
    try {
        const { id: conversationID } = validatedParams(req);
        const { limit, beforeID } = validatedQuery(req);
        const messages = await chatService.getConversationMessages({
            conversationID,
            userID: req.user.id,
            limit,
            beforeID,
        });
        return res.status(200).json({ messages });
    } catch (err) {
        return handleError(err, res, next);
    }
}

export async function markConversationRead(req, res, next) {
    try {
        const { id: conversationID } = validatedParams(req);
        const result = await chatService.markAsRead({
            conversationID,
            userID: req.user.id,
        });
        return res.status(200).json({ message: 'Conversation marked as read.', ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
}
