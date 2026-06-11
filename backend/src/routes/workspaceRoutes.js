import express from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as workspaceController from "../controllers/workspaceController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { z } from "zod";

const router = express.Router();

const todoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["note", "checklist", "progress", "links"]).optional(),
  content: z.string().optional().nullable(),
  items: z.array(z.object({ text: z.string(), done: z.boolean() })).nullable().optional(),
  visible: z.boolean().optional(),
});

router.use(authMiddleware.authenticateToken);

router.get("/contracts/:id/workspace", workspaceController.getWorkspace);

router.post("/contracts/:id/workspace/todos", validateRequest({ body: todoSchema }), workspaceController.addTodo);
router.patch("/contracts/:id/workspace/todos/:todoId", workspaceController.updateTodo);
router.delete("/contracts/:id/workspace/todos/:todoId", workspaceController.deleteTodo);

router.post("/contracts/:id/workspace/sections", validateRequest({ body: sectionSchema }), workspaceController.addSection);
router.patch("/contracts/:id/workspace/sections/:sectionId", workspaceController.updateSection);
router.delete("/contracts/:id/workspace/sections/:sectionId", workspaceController.deleteSection);

export default router;