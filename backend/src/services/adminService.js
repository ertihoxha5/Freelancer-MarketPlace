import * as adminRepository from '../repositories/adminRepository.js';
import { validationError } from '../utils/errors.js';

export async function getAllUsers({ page = 1, limit = 50 } = {}) {
	return adminRepository.getUsers({ page, limit });
}

export async function updateUserById(id, payload) {
	const userId = Number(id);
	if (!Number.isInteger(userId) || userId <= 0) {
		throw validationError('Valid user id is required.');
	}

	const { fullName, roleID } = payload ?? {};
	if (typeof fullName !== 'string' || fullName.trim() === '') {
		throw validationError('fullName is required.');
	}

	const parsedRoleId = Number(roleID);
	if (!Number.isInteger(parsedRoleId) || (parsedRoleId !== 2 && parsedRoleId !== 3)) {
		throw validationError('roleID must be 2 (client) or 3 (freelancer).');
	}

	return adminRepository.updateUser({
		id: userId,
		fullName: fullName.trim(),
		roleID: parsedRoleId,
	});
}

export async function deleteUserById(id) {
	const userId = Number(id);
	if (!Number.isInteger(userId) || userId <= 0) {
		throw validationError('Valid user id is required.');
	}

	return adminRepository.deleteUser(userId);
}
