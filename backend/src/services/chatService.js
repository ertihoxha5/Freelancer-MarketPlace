import * as chatRepository from '../repositories/chatRepository.js';

function validationError(message) {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
}

function forbiddenError(message = 'You do not have permission to access this conversation.') {
    const err = new Error(message);
    err.statusCode = 403;
    return err;
}

function notFoundError(message) {
    const err = new Error(message);
    err.statusCode = 404;
    return err;
}

function parsePositiveInt(value, label) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw validationError(`Valid ${label} is required.`);
    }
    return parsed;
}

export async function createOrGetConversation({ projectID, requesterID }) {
    const projectId = parsePositiveInt(projectID, 'project ID');
    const requesterId = parsePositiveInt(requesterID, 'requester ID');

    const parties = await chatRepository.findProjectParties(projectId);
    if (!parties) {
        throw notFoundError('Project conversation cannot be created until a freelancer is accepted.');
    }

    if (requesterId !== parties.clientID && requesterId !== parties.freelancerID) {
        throw forbiddenError();
    }

    const existing = await chatRepository.findConversationByProjectAndParties(
        projectId,
        parties.clientID,
        parties.freelancerID,
    );
    if (existing) {
        const participants = await chatRepository.getConversationParticipants(existing.id);
        return { ...existing, participants };
    }

    const conversationID = await chatRepository.createConversation({
        projectID: projectId,
        clientID: parties.clientID,
        freelancerID: parties.freelancerID,
    });
    const created = await chatRepository.getConversationByIdForUser(conversationID, requesterId);
    const participants = await chatRepository.getConversationParticipants(conversationID);
    return { ...created, participants };
}

export async function getMyConversations(userID) {
    const userId = parsePositiveInt(userID, 'user ID');
    const conversations = await chatRepository.listConversationsForUser(userId);
    return conversations;
}

export async function searchUsers({ requesterID, query }) {
    const requesterId = parsePositiveInt(requesterID, 'requester ID');
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length < 2) {
        throw validationError('Search query must be at least 2 characters.');
    }
    return chatRepository.searchUsersByNameOrEmail({ requesterID: requesterId, query: q });
}

export async function createOrGetDirectConversation({ requesterID, receiverID }) {
    const requesterId = parsePositiveInt(requesterID, 'requester ID');
    const receiverId = parsePositiveInt(receiverID, 'receiver ID');
    if (requesterId === receiverId) {
        throw validationError('You cannot start a conversation with yourself.');
    }

    const receiver = await chatRepository.findActiveUserById(receiverId);
    if (!receiver) {
        throw notFoundError('Receiver not found.');
    }

    const existing = await chatRepository.findDirectConversationBetweenUsers(requesterId, receiverId);
    if (existing) {
        const participants = await chatRepository.getConversationParticipants(existing.id);
        return { ...existing, participants };
    }

    const conversationID = await chatRepository.createDirectConversation({
        userAID: requesterId,
        userBID: receiverId,
    });
    const created = await chatRepository.getConversationByIdForUser(conversationID, requesterId);
    const participants = await chatRepository.getConversationParticipants(conversationID);
    return { ...created, participants };
}

export async function getConversationMessages({ conversationID, userID, limit, beforeID }) {
    const conversationId = parsePositiveInt(conversationID, 'conversation ID');
    const userId = parsePositiveInt(userID, 'user ID');
    const take = limit == null ? 30 : Number(limit);
    const before = beforeID == null ? null : Number(beforeID);

    if (!Number.isInteger(take) || take <= 0 || take > 100) {
        throw validationError('Limit must be an integer between 1 and 100.');
    }
    if (before != null && (!Number.isInteger(before) || before <= 0)) {
        throw validationError('beforeID must be a positive integer.');
    }

    const conversation = await chatRepository.getConversationByIdForUser(conversationId, userId);
    if (!conversation) {
        throw notFoundError('Conversation not found.');
    }

    const messages = await chatRepository.listMessages(conversationId, take, before);
    return messages;
}

export async function sendMessage({ conversationID, senderID, content, msgType = 'text', field = null }) {
    const conversationId = parsePositiveInt(conversationID, 'conversation ID');
    const senderId = parsePositiveInt(senderID, 'sender ID');
    const messageContent = typeof content === 'string' ? content.trim() : '';
    if (!messageContent) {
        throw validationError('Message content is required.');
    }

    const conversation = await chatRepository.getConversationByIdForUser(conversationId, senderId);
    if (!conversation) {
        throw forbiddenError();
    }
    if (conversation.cStatus !== 'active') {
        throw validationError('Conversation is not active.');
    }

    return chatRepository.createMessage({
        conversationID: conversationId,
        senderID: senderId,
        content: messageContent,
        msgType,
        field,
    });
}

export async function markAsRead({ conversationID, userID }) {
    const conversationId = parsePositiveInt(conversationID, 'conversation ID');
    const userId = parsePositiveInt(userID, 'user ID');
    const conversation = await chatRepository.getConversationByIdForUser(conversationId, userId);
    if (!conversation) {
        throw notFoundError('Conversation not found.');
    }
    const affected = await chatRepository.markConversationRead(conversationId, userId);
    return { affected };
}
