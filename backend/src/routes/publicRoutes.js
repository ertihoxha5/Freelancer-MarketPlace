import { Router } from "express";
import * as publicController from "../controllers/publicController.js";
import * as testimonialController from "../controllers/testimonialController.js";

const router = Router();

router.get("/home-data", publicController.getHomeData);
router.get("/testimonials", testimonialController.getTestimonials);

export default router;
