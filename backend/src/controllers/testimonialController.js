import * as testimonialService from "../services/testimonialService.js";
import { validatedParams } from "../middleware/validateRequest.js";

export async function getTestimonials(req, res, next) {
  try {
    const testimonials = await testimonialService.getTestimonials(req.query?.limit);
    return res.status(200).json({ testimonials });
  } catch (err) {
    next(err);
  }
}

export async function createTestimonial(req, res, next) {
  try {
    const testimonial = await testimonialService.createTestimonial(
      req.user,
      req.body,
    );
    return res.status(201).json({ message: "Testimonial created.", testimonial });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getMyTestimonials(req, res, next) {
  try {
    const testimonials = await testimonialService.getMyTestimonials(req.user.id);
    return res.status(200).json({ testimonials });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function updateMyTestimonial(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const testimonial = await testimonialService.updateMyTestimonial(
      req.user.id,
      id,
      req.body,
    );
    return res.status(200).json({ message: "Testimonial updated.", testimonial });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function deleteMyTestimonial(req, res, next) {
  try {
    const { id } = validatedParams(req);
    await testimonialService.deleteMyTestimonial(req.user.id, id);
    return res.status(200).json({ message: "Testimonial deleted." });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}
