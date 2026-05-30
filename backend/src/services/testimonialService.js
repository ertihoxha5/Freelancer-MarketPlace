import * as testimonialRepository from "../repositories/testimonialRepository.js";
import { validate } from "../validation/validate.js";
import { testimonialSchemas } from "../validation/schemas.js";
import { validationError } from "../utils/errors.js";

export async function getTestimonials(limit = 6) {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 6));
  return testimonialRepository.listTestimonials({ limit: safeLimit });
}

export async function createTestimonial(user, payload) {
  if (!user?.id) {
    throw validationError("Authenticated user is required.");
  }
  const validated = validate(testimonialSchemas.create, payload ?? {});
  return testimonialRepository.createTestimonial({
    userID: Number(user.id),
    fullName: validated.fullName,
    roleTitle: validated.roleTitle,
    rating: validated.rating,
    comment: validated.comment,
    isPublished: true,
  });
}

