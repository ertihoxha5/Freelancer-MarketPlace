import * as adminService from '../services/adminService.js';

export async function getUsers(req, res, next) {
    try {
        const users = await adminService.getAllUsers();
        return res.status(200).json({ users });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function updateUser(req, res, next) {
    try {
        const updatedUser = await adminService.updateUserById(req.params.id, req.body);
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
}

export async function deleteUser(req, res, next) {
    try {
        const result = await adminService.deleteUserById(req.params.id);
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
}