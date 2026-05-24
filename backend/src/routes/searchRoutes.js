import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as searchRepository from "../repositories/searchRepository.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

function actor(req) {
  return { userID: Number(req.user.id), roleID: Number(req.user.roleID) };
}

function sendResult(handler) {
  return async (req, res, next) => {
    try {
      const result = await handler(req);
      return res.status(200).json(result);
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };
}

router.get(
  "/projects",
  sendResult((req) => searchRepository.searchProjects(req.query)),
);

router.get(
  "/freelancers",
  sendResult((req) => searchRepository.searchFreelancers(req.query)),
);

router.get(
  "/users",
  authMiddleware.requireRole(1),
  sendResult((req) => searchRepository.searchUsers(req.query)),
);

router.get(
  "/applications",
  sendResult((req) =>
    searchRepository.searchApplications(req.query, actor(req)),
  ),
);

router.get(
  "/contracts",
  sendResult((req) => searchRepository.searchContracts(req.query, actor(req))),
);

export default router;
