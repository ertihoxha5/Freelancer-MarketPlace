import * as adminRepository from '../repositories/adminRepository.js';

export async function getAllUsers() {
	return adminRepository.getUsers();
}

export async function updateUserById(id, payload) {
	const userId = Number(id);
	if (!Number.isInteger(userId) || userId <= 0) {
		const err = new Error('Valid user id is required.');
		err.statusCode = 400;
		throw err;
	}

	const { fullName, roleID } = payload ?? {};
	if (typeof fullName !== 'string' || fullName.trim() === '') {
		const err = new Error('fullName is required.');
		err.statusCode = 400;
		throw err;
	}

	const parsedRoleId = Number(roleID);
	if (!Number.isInteger(parsedRoleId) || (parsedRoleId !== 2 && parsedRoleId !== 3)) {
		const err = new Error('roleID must be 2 (client) or 3 (freelancer).');
		err.statusCode = 400;
		throw err;
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
		const err = new Error('Valid user id is required.');
		err.statusCode = 400;
		throw err;
	}

	return adminRepository.deleteUser(userId);
}
