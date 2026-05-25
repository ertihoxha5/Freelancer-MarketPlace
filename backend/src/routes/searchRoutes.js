import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as searchRepository from "../repositories/searchRepository.js";
import { validateRequest, validatedQuery } from "../middleware/validateRequest.js";
import { querySchemas } from "../validation/schemas.js";

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
  validateRequest({ query: querySchemas.search }),
  sendResult((req) => searchRepository.searchProjects(validatedQuery(req))),
);

router.get(
  "/freelancers",
  validateRequest({ query: querySchemas.search }),
  sendResult((req) => searchRepository.searchFreelancers(validatedQuery(req))),
);

router.get(
  "/users",
  authMiddleware.requireRole(1),
  validateRequest({ query: querySchemas.search }),
  sendResult((req) => searchRepository.searchUsers(validatedQuery(req))),
);

router.get(
  "/applications",
  validateRequest({ query: querySchemas.search }),
  sendResult((req) =>
    searchRepository.searchApplications(validatedQuery(req), actor(req)),
  ),
);

router.get(
  "/contracts",
  validateRequest({ query: querySchemas.search }),
  sendResult((req) =>
    searchRepository.searchContracts(validatedQuery(req), actor(req)),
  ),
);

export default router;
