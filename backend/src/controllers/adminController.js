import * as adminService from '../services/adminService.js';
import * as userService from '../services/userService.js';
import * as disputeRepository from '../repositories/disputeRepository.js';
import {
    validatedBody,
    validatedParams,
    validatedQuery,
} from '../middleware/validateRequest.js';
import { validationError } from '../utils/errors.js';

export async function getUsers(req, res, next) {
    try {
        const { page, limit } = validatedQuery(req);
        const result = await adminService.getAllUsers({ page, limit });
        return res.status(200).json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
};

export async function updateUser(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const updatedUser = await adminService.updateUserById(id, validatedBody(req));
        return res.status(200).json({
            message: 'User updated successfully.',
            user: updatedUser,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
};

export async function deleteUser(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const result = await adminService.deleteUserById(id);
        return res.status(200).json({
            message: 'User marked as inactive.',
            user: result,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
};

export async function registerUser(req, res, next) {
     try {
            const result = await userService.registerUser(validatedBody(req));
            return res.status(201).json({
                id: result.userID,
                email: result.email,
                fullName: result.fullName,
                roleID: result.roleID,
            });
        } catch (err) {
            if (err.statusCode) {
                return res.status(err.statusCode).json({ message: err.message });
            }
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
            next(err);
        }
};

export async function getDisputes(req, res, next) {
    try {
        const { status } = validatedQuery(req);
        const disputes = await disputeRepository.getAllDisputes({ status: status || undefined });
        return res.status(200).json({
            total: disputes.length,
            disputes,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function getDisputeById(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const dispute = await disputeRepository.getDisputeById(id);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found.' });
        }
        return res.status(200).json(dispute);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function updateDisputeStatus(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const { status, resolution } = validatedBody(req);
        
        if (!status) {
            throw validationError('Status is required.');
        }
        
        const validStatuses = ['open', 'in_review', 'resolved', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw validationError(`Status must be one of: ${validStatuses.join(', ')}`);
        }

        const updatedDispute = await disputeRepository.updateDisputeStatus({
            id,
            status,
            resolution: resolution || null,
            resolvedBy: req.user?.id,
        });

        if (!updatedDispute) {
            return res.status(404).json({ message: 'Dispute not found.' });
        }

        return res.status(200).json({
            message: 'Dispute updated successfully.',
            dispute: updatedDispute,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}