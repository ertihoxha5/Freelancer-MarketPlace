import * as testimonialRepository from "../repositories/testimonialRepository.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { validate } from "../validation/validate.js";
import { testimonialSchemas } from "../validation/schemas.js";
import { validationError } from "../utils/errors.js";

function toShortString(value) {
  const str = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return str.length > 500 ? str.slice(0, 500) + "..." : str;
}

export async function getTestimonials(limit = 6) {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 6));
  return testimonialRepository.listTestimonials({ limit: safeLimit });
}

export async function createTestimonial(user, payload) {
  if (!user?.id) {
    throw validationError("Authenticated user is required.");
  }
  const validated = validate(testimonialSchemas.create, payload ?? {});
  const testimonial = await testimonialRepository.createTestimonial({
    userID: Number(user.id),
    fullName: validated.fullName,
    roleTitle: validated.roleTitle,
    rating: validated.rating,
    comment: validated.comment,
    isPublished: true,
  });

  await auditRepository.insertAuditLog({
    entity: "Testimonial",
    entityID: testimonial.id,
    actionPerformed: "create",
    oldValue: null,
    newValue: toShortString(validated),
    userID: Number(user.id),
  }).catch(() => {});

  return testimonial;
}

export async function getMyTestimonials(userID) {
  if (!userID) throw validationError("User ID is required.");
  return testimonialRepository.getTestimonialsByUser(Number(userID));
}

export async function updateMyTestimonial(userID, testimonialId, payload) {
  if (!userID) throw validationError("User ID is required.");
  const validated = validate(testimonialSchemas.create, payload ?? {});
  const updated = await testimonialRepository.updateTestimonial(
    Number(testimonialId),
    Number(userID),
    {
      fullName: validated.fullName,
      roleTitle: validated.roleTitle,
      rating: validated.rating,
      comment: validated.comment,
    },
  );
  if (!updated) {
    throw validationError("Testimonial not found or you do not have permission to edit it.");
  }
  return updated;
}

export async function deleteMyTestimonial(userID, testimonialId) {
  if (!userID) throw validationError("User ID is required.");
  const ok = await testimonialRepository.deleteTestimonial(Number(testimonialId), Number(userID));
  if (!ok) {
    throw validationError("Testimonial not found or you do not have permission to delete it.");
  }
  return { success: true };
}

