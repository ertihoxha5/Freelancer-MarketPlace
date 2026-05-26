import { z } from "zod";
import { strongPasswordSchema } from "./password.js";

const trimmedString = (label, max) => {
  let schema = z.string({ error: `${label} is required.` }).trim().min(1, {
    message: `${label} is required.`,
  });
  if (max) {
    schema = schema.max(max, {
      message: `${label} must be ${max} characters or fewer.`,
    });
  }
  return schema;
};

const optionalTrimmedString = (max, label = "Value") =>
  z
    .string()
    .trim()
    .max(max, { message: `${label} must be ${max} characters or fewer.` })
    .optional()
    .nullable()
    .transform((value) => value || null);

export const positiveIntSchema = (label) =>
  z.coerce
    .number({ error: `Valid ${label} is required.` })
    .int({ message: `Valid ${label} is required.` })
    .positive({ message: `Valid ${label} is required.` });

const nullablePositiveMoney = (label) =>
  z
    .union([z.coerce.number(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value === "" || value == null ? null : Number(value)))
    .refine((value) => value == null || value >= 0, {
      message: `${label} must be a non-negative number.`,
    });

const nullablePositiveInt = (label) =>
  z
    .union([z.coerce.number(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value === "" || value == null ? null : Number(value)))
    .refine((value) => value == null || Number.isInteger(value), {
      message: `${label} must be an integer.`,
    })
    .refine((value) => value == null || value > 0, {
      message: `${label} must be greater than zero.`,
    });

const nullableDateString = z
  .union([z.string().trim(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value === "" || value == null ? null : value))
  .refine((value) => value == null || !Number.isNaN(new Date(value).getTime()), {
    message: "Date is invalid.",
  });

export const paramSchemas = {
  id: z.object({ id: positiveIntSchema("id") }),
  mongoId: z.object({
    id: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Valid id is required."),
  }),
  projectId: z.object({ projectId: positiveIntSchema("project ID") }),
  projectID: z.object({ projectID: positiveIntSchema("project ID") }),
  applicationId: z.object({
    applicationId: positiveIntSchema("application ID"),
  }),
  contractId: z.object({ contractId: positiveIntSchema("contract ID") }),
  contractID: z.object({ contractID: positiveIntSchema("contract ID") }),
  conversationId: z.object({ id: positiveIntSchema("conversation ID") }),
};

export const querySchemas = {
  pagination: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  }),
  search: z.object({
    q: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    categoryID: z.coerce.number().int().positive().optional(),
    minBudget: z.coerce.number().nonnegative().optional(),
    maxBudget: z.coerce.number().nonnegative().optional(),
    deadline: z.string().trim().optional(),
    sort: z
      .enum(["budget_asc", "budget_desc", "date_asc", "date_desc"])
      .optional(),
    status: z.string().trim().max(50).optional(),
    roleID: z.coerce.number().int().optional(),
    clientID: z.coerce.number().int().positive().optional(),
    freelancerID: z.coerce.number().int().positive().optional(),
    projectID: z.coerce.number().int().positive().optional(),
    format: z.enum(["csv", "xlsx", "json"]).optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
  }),
  chatSearch: z.object({
    q: z
      .string()
      .trim()
      .min(2, "Search query must be at least 2 characters.")
      .max(100),
  }),
  chatMessages: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    beforeID: z.coerce.number().int().positive().optional(),
  }),
  activityFeed: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    eventType: z.string().trim().max(50).optional(),
    onlyUnread: z.enum(["true", "false"]).optional(),
  }),
  browseProjects: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(200).optional(),
    categoryID: z.coerce.number().int().positive().optional(),
    minBudget: z.coerce.number().nonnegative().optional(),
    maxBudget: z.coerce.number().nonnegative().optional(),
    sort: z.string().trim().max(50).optional(),
  }),
};

export const authSchemas = {
  login: z.object({
    email: z.string().trim().toLowerCase().email("Valid email is required."),
    password: z.string().min(1, "Password is required.").max(128),
  }),
  refresh: z.object({
    refreshToken: z.string().min(1).max(256).optional(),
  }),
  logout: z.object({
    refreshToken: z.string().min(1).max(256).optional(),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1, "Current password is required.").max(128),
    newPassword: strongPasswordSchema,
  }),
  verifyEmail: z.object({
    token: z.string().trim().min(1, "Verification token is required.").max(128),
  }),
  forgotPassword: z.object({
    email: z.string().trim().toLowerCase().email("Valid email is required."),
  }),
  resetPassword: z.object({
    token: z.string().trim().min(1, "Reset token is required.").max(128),
    newPassword: strongPasswordSchema,
  }),
};

export const userSchemas = {
  register: z.object({
    fullName: trimmedString("fullName", 50),
    email: z.string().trim().toLowerCase().email("Valid email is required."),
    password: strongPasswordSchema,
    roleID: z.coerce
      .number()
      .int()
      .refine((value) => value === 2 || value === 3, {
        message: "roleID must be 2 (Client) or 3 (Freelancer).",
      }),
  }),
};

export const adminSchemas = {
  updateUser: z.object({
    fullName: trimmedString("fullName", 50),
    roleID: z.coerce
      .number()
      .int()
      .refine((value) => value === 2 || value === 3, {
        message: "roleID must be 2 (Client) or 3 (Freelancer).",
      }),
  }),
};

export const catalogSchemas = {
  category: z.object({
    cName: trimmedString("cName", 20),
    cDesc: trimmedString("cDesc", 100),
    slug: optionalTrimmedString(20, "slug"),
    isActive: z.coerce.boolean().optional(),
  }),
  skill: z.object({
    skillName: trimmedString("skillName", 30),
    slug: optionalTrimmedString(30, "slug"),
    categoryID: positiveIntSchema("categoryID"),
    isActive: z.coerce.boolean().optional(),
  }),
};

export const chatSchemas = {
  projectConversation: z.object({
    projectID: positiveIntSchema("project ID"),
  }),
  directConversation: z.object({
    receiverID: positiveIntSchema("receiver ID"),
  }),
};

const skillLevelEnum = z.enum(["beginner", "intermediate", "advanced", "expert"]);

export const profileSchemas = {
  update: z
    .object({
      hourlyRate: z
        .union([z.coerce.number().nonnegative(), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v === "" ? null : v)),
      portofoliUrl: z.string().trim().max(500).optional().nullable(),
      bio: z.string().trim().max(255).optional().nullable(),
      pictureBase64: z.string().max(7_000_000).optional(),
      skills: z
        .array(
          z.object({
            skillID: positiveIntSchema("skill ID"),
            sLevel: skillLevelEnum,
            yearsOfExp: z.coerce.number().int().nonnegative(),
          }),
        )
        .max(50)
        .optional(),
    })
    .refine(
      (data) =>
        data.hourlyRate !== undefined ||
        data.portofoliUrl !== undefined ||
        data.bio !== undefined ||
        data.pictureBase64 !== undefined ||
        data.skills !== undefined,
      { message: "At least one profile field is required." },
    ),
};

export const projectSchemas = {
  adminCreateOrUpdate: z.object({
    title: trimmedString("Title", 100),
    pDesc: optionalTrimmedString(5000, "Description"),
    budget: nullablePositiveMoney("Budget"),
    deadline: nullableDateString,
    clientID: positiveIntSchema("clientID").optional(),
    pStatus: z
      .enum(["pending", "active", "completed", "cancelled"])
      .optional()
      .default("pending"),
  }),
  clientCreateOrUpdate: z.object({
    title: trimmedString("Title", 100),
    pDesc: optionalTrimmedString(5000, "Description"),
    budget: nullablePositiveMoney("Budget"),
    deadline: nullableDateString,
    pStatus: z.enum(["pending", "active", "completed", "cancelled"]).optional(),
  }),
};

export const proposalSchemas = {
  createOrUpdate: z.object({
    coverLetter: trimmedString("Cover letter", 5000),
    bidAmount: nullablePositiveMoney("Bid amount"),
    estimatedDays: nullablePositiveInt("Estimated days"),
  }),
  status: z.object({
    propStatus: z.enum(["pending", "accepted", "rejected"], {
      error: "Status must be pending, accepted, or rejected.",
    }),
  }),
};

export const milestoneSchemas = {
  create: z.object({
    title: trimmedString("Milestone title", 100),
    mDesc: optionalTrimmedString(500, "Milestone description").default(""),
    amountPayable: z.coerce
      .number()
      .positive("Milestone amount must be greater than zero."),
    dueDate: nullableDateString,
  }),
  status: z.object({
    mStatus: z.enum([
      "pending",
      "in_progress",
      "submitted",
      "approved",
      "rejected",
    ]),
  }),
};

export const reviewSchemas = {
  create: z.object({
    stars: z.coerce
      .number()
      .int("Stars must be an integer between 1 and 5.")
      .min(1, "Stars must be an integer between 1 and 5.")
      .max(5, "Stars must be an integer between 1 and 5."),
    comment: trimmedString("Review comment", 1000).min(10, {
      message: "Review comment must be at least 10 characters.",
    }),
  }),
};

export const contractSchemas = {
  id: z.object({
    contractID: positiveIntSchema("contract ID"),
  }),
};

export const importSchemas = {
  projects: z.object({
    clientID: positiveIntSchema("clientID").optional(),
  }),
};

export const paymentSchemas = {
  createIntent: z.object({
    contractID: positiveIntSchema("contract ID"),
    amount: z.coerce
      .number()
      .positive("Amount must be greater than zero."),
    milestoneID: positiveIntSchema("milestone ID").optional(),
  }),
  confirm: z.object({
    paymentIntentId: z
      .string()
      .trim()
      .min(1, "paymentIntentId is required.")
      .max(255),
  }),
  refund: z.object({
    paymentIntentId: z
      .string()
      .trim()
      .min(1, "paymentIntentId is required.")
      .max(255),
    reason: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || undefined),
  }),
  historyQuery: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
};
