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

	const { fullName } = payload ?? {};
	if (typeof fullName !== 'string' || fullName.trim() === '') {
		const err = new Error('fullName is required.');
		err.statusCode = 400;
		throw err;
	}

	return adminRepository.updateUser({
		id: userId,
		fullName: fullName.trim(),
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
