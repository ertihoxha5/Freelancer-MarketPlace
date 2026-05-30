import * as testimonialService from "../services/testimonialService.js";

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

