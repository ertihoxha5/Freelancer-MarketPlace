import { z } from "zod";
import { strongPasswordSchema } from "./password.js";

const trimmedString = (label, max) => {
  let schema = z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, {
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

const optionalUrlString = (max, label = "Value") =>
  z
    .string()
    .trim()
    .max(max, { message: `${label} must be ${max} characters or fewer.` })
    .url({ message: `${label} must be a valid URL.` })
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
    .transform((value) =>
      value === "" || value == null ? null : Number(value),
    )
    .refine((value) => value == null || value >= 0, {
      message: `${label} must be a non-negative number.`,
    });

const nullablePositiveInt = (label) =>
  z
    .union([z.coerce.number(), z.literal(""), z.null(), z.undefined()])
    .transform((value) =>
      value === "" || value == null ? null : Number(value),
    )
    .refine((value) => value == null || Number.isInteger(value), {
      message: `${label} must be an integer.`,
    })
    .refine((value) => value == null || value > 0, {
      message: `${label} must be greater than zero.`,
    });

const nullableDateString = z
  .union([z.string().trim(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value === "" || value == null ? null : value))
  .refine(
    (value) => value == null || !Number.isNaN(new Date(value).getTime()),
    {
      message: "Date is invalid.",
    },
  );

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
  freelancerID: z.object({ freelancerID: positiveIntSchema("freelancer ID") }),
  reviewID: z.object({
    reviewID: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Valid reviewID is required."),
  }),
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
  reviewList: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z
      .enum(["newest", "oldest", "helpful", "rating_desc", "rating_asc"])
      .optional(),
    from: nullableDateString.optional(),
    to: nullableDateString.optional(),
    minHelpful: z.coerce.number().int().min(0).optional(),
  }),
  savedProjects: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    sort: z.enum(["recent", "oldest", "popular"]).optional(),
    categoryID: z.coerce.number().int().positive().optional(),
    minBudget: z.coerce.number().nonnegative().optional(),
    maxBudget: z.coerce.number().nonnegative().optional(),
    from: nullableDateString.optional(),
    to: nullableDateString.optional(),
    q: z.string().trim().max(200).optional(),
    format: z.enum(["json", "csv"]).optional(),
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
  milestoneList: z.object({
    status: z
      .enum(["pending", "in_progress", "completed", "overdue"])
      .optional(),
    from: nullableDateString.optional(),
    to: nullableDateString.optional(),
    sortBy: z.enum(["deadline", "createdAt"]).optional().default("deadline"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
    groupBy: z.enum(["project"]).optional(),
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
    currentPassword: z
      .string()
      .min(1, "Current password is required.")
      .max(128),
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
    fullName: trimmedString("fullName", 255),
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
    fullName: trimmedString("fullName", 255),
    roleID: z.coerce
      .number()
      .int()
      .refine((value) => value === 2 || value === 3, {
        message: "roleID must be 2 (Client) or 3 (Freelancer).",
      }),
  }),
  updateDispute: z.object({
    status: z.enum(['open', 'in_review', 'resolved', 'rejected']),
    resolution: z.string().optional(),
  }),
};

export const catalogSchemas = {
  category: z.object({
    cName: trimmedString("cName", 255).min(3, {
      message: "cName must be at least 3 characters.",
    }),
    cDesc: trimmedString("cDesc", 2000),
    slug: optionalTrimmedString(50, "slug"),
    iconUrl: optionalUrlString(255, "iconUrl"),
    parentCategoryID: positiveIntSchema("parentCategoryID").optional(),
    sortOrder: z.coerce
      .number()
      .int({ message: "sortOrder must be an integer." })
      .optional(),
    isActive: z.coerce.boolean().optional(),
  }),
  categoryOrder: z
    .array(
      z.object({
        id: positiveIntSchema("id"),
        sortOrder: z.coerce
          .number()
          .int({ message: "sortOrder must be an integer." }),
      }),
    )
    .min(1, {
      message: "Category order array must include at least one item.",
    }),
  skill: z.object({
    skillName: trimmedString("skillName", 255),
    slug: optionalTrimmedString(30, "slug"),
    categoryID: positiveIntSchema("categoryID"),
    isActive: z.coerce.boolean().optional(),
  }),
};

const skillCategoryEnum = z.enum(["freelancer", "designer", "developer"]);

export const skillSchemas = {
  create: z.object({
    skillName: trimmedString("skillName", 50).min(
      3,
      "Skill name must be at least 3 characters.",
    ),
    description: optionalTrimmedString(200, "description"),
    category: skillCategoryEnum,
  }),
  update: z
    .object({
      skillName: trimmedString("skillName", 50)
        .min(3, "Skill name must be at least 3 characters.")
        .optional(),
      description: optionalTrimmedString(200, "description").optional(),
      category: skillCategoryEnum.optional(),
      isActive: z.coerce.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required.",
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

const skillLevelEnum = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);

export const profileSchemas = {
  update: z
    .object({
      hourlyRate: z
        .union([z.coerce.number().nonnegative(), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v === "" ? null : v)),
      portofoliUrl: z.string().trim().max(500).optional().nullable(),
      bio: z.string().trim().max(255).optional().nullable(),
      pictureBase64: z.string().max(7_000_000).optional().nullable(),
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
    categoryID: positiveIntSchema("categoryID").optional().nullable(),
    clientID: positiveIntSchema("clientID").optional(),
    maxFreelancers: z.coerce.number().int().min(1).max(20).optional().default(1),
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
    categoryID: positiveIntSchema("categoryID").optional().nullable(),
    maxFreelancers: z.coerce.number().int().min(1).max(20).optional().default(1),
    pStatus: z.enum(["pending", "active", "completed", "cancelled"]).optional(),
    phases: z
      .array(
        z.object({
          title: z.string().trim().max(100).optional().default(""),
          deadline: nullableDateString,
          budget: nullablePositiveMoney("Phase budget"),
          description: z.string().trim().max(1000).optional().default(""),
        }),
      )
      .max(10, "At most 10 phases allowed.")
      .optional()
      .default([]),
    experienceLevel: z.enum(["Entry", "Intermediate", "Expert"]).optional().nullable(),
    skills: optionalTrimmedString(300, "Skills"),
    projectType: z.enum(["Fixed", "Hourly", "Milestone-based"]).optional().nullable(),
  }),
};

export const proposalSchemas = {
  createOrUpdate: z.object({
    coverLetter: trimmedString("Cover letter", 5000),
    bidAmount: nullablePositiveMoney("Bid amount"),
    estimatedDays: nullablePositiveInt("Estimated days"),
    attachmentBase64: z.string().max(8_000_000).optional().nullable(),
    attachmentName: z.string().trim().max(255).optional().nullable(),
  }),
  status: z.object({
    propStatus: z.enum(["pending", "accepted", "rejected"], {
      error: "Status must be pending, accepted, or rejected.",
    }),
  }),
};

export const testimonialSchemas = {
  create: z.object({
    fullName: trimmedString("fullName", 80),
    roleTitle: trimmedString("roleTitle", 80),
    rating: z.coerce.number().int().min(1).max(5),
    comment: trimmedString("comment", 1000),
  }),
  adminUpdate: z.object({
    isPublished: z.coerce.boolean().optional(),
  }),
};

export const settingsSchemas = {
  update: z.object({
    items: z
      .array(
        z.object({
          sKey: trimmedString("sKey", 50),
          sValue: z.string().trim().max(2000),
          sDesc: z.string().trim().max(500).optional().nullable(),
        }),
      )
      .min(1),
  }),
};

export const milestoneSchemas = {
  create: z.object({
    title: trimmedString("Milestone title", 255),
    mDesc: optionalTrimmedString(2000, "Milestone description").default(""),
    amountPayable: z.coerce
      .number()
      .positive("Milestone amount must be greater than zero."),
    dueDate: nullableDateString,
  }),
  projectCreate: z.object({
    title: trimmedString("Milestone title", 255),
    mDesc: optionalTrimmedString(2000, "Milestone description").default(""),
    projectPhase: z
      .array(trimmedString("Project phase", 100))
      .max(30, "At most 30 project phases are allowed.")
      .optional()
      .default([]),
    budget: z.coerce
      .number()
      .positive("Milestone budget must be greater than zero."),
    deadline: nullableDateString,
    comments: optionalTrimmedString(2000, "Comments").optional().default(null),
    attachments: z.array(z.string().trim().max(500)).optional().default([]),
  }),
  statusV2: z.object({
    status: z.enum(["pending", "in_progress", "completed", "overdue"]),
    comments: optionalTrimmedString(2000, "Comments").optional(),
    completionDate: nullableDateString.optional(),
  }),
  statusFlexible: z
    .object({
      mStatus: z
        .enum(["pending", "in_progress", "submitted", "approved", "rejected"])
        .optional(),
      status: z
        .enum(["pending", "in_progress", "completed", "overdue"])
        .optional(),
      comments: optionalTrimmedString(2000, "Comments").optional(),
      completionDate: nullableDateString.optional(),
    })
    .refine((data) => Boolean(data.mStatus || data.status), {
      message: "Either mStatus or status is required.",
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
    rating: z.coerce
      .number()
      .int("Rating must be an integer between 1 and 5.")
      .min(1, "Rating must be an integer between 1 and 5.")
      .max(5, "Rating must be an integer between 1 and 5."),
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters.")
      .max(100, "Title must be 100 characters or fewer.")
      .optional(),
    comment: trimmedString("Review comment", 1000).min(10, {
      message: "Review comment must be at least 10 characters.",
    }),
    tags: z
      .array(trimmedString("tag", 50))
      .max(10, "At most 10 tags may be provided.")
      .optional(),
  }),
  update: z
    .object({
      rating: z.coerce
        .number()
        .int("Rating must be an integer between 1 and 5.")
        .min(1, "Rating must be an integer between 1 and 5.")
        .max(5, "Rating must be an integer between 1 and 5.")
        .optional(),
      title: z
        .string()
        .trim()
        .min(5, "Title must be at least 5 characters.")
        .max(100, "Title must be 100 characters or fewer.")
        .optional(),
      comment: z
        .string()
        .trim()
        .min(10, "Review comment must be at least 10 characters.")
        .max(1000, "Review comment must be 1000 characters or fewer.")
        .optional(),
      tags: z
        .array(trimmedString("tag", 50))
        .max(10, "At most 10 tags may be provided.")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one review field is required.",
    }),
};

export const contractSchemas = {
  id: z.object({
    contractID: positiveIntSchema("contract ID"),
  }),
  dispute: z.object({
    reason: trimmedString("Dispute reason", 2000).min(10, {
      message: "Dispute reason must be at least 10 characters.",
    }),
  }),
};

export const importSchemas = {
  projects: z.object({
    clientID: positiveIntSchema("clientID").optional(),
  }),
  applications: z.object({
    projectID: positiveIntSchema("projectID").optional(),
  }),
  contracts: z.object({
  }),
  freelancers: z.object({
  }),
};

export const paymentSchemas = {
  createIntent: z.object({
    contractID: positiveIntSchema("contract ID"),
    amount: z.coerce.number().positive("Amount must be greater than zero."),
    milestoneID: positiveIntSchema("milestone ID").optional(),
    description: z.string().trim().max(500).optional(),
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
    amount: z.coerce.number().positive().optional(),
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

export const savedProjectSchemas = {
  bulkSave: z.object({
    projectIDs: z
      .array(z.coerce.number().int().positive())
      .min(1, "At least one project ID is required."),
  }),
  bulkDelete: z.object({
    projectIDs: z
      .array(z.coerce.number().int().positive())
      .min(1, "At least one project ID is required."),
  }),
  moveToFolder: z.object({
    folder: trimmedString("folder", 50).min(1, "Folder name is required."),
  }),
  update: z
    .object({
      notes: optionalTrimmedString(500, "notes"),
      priority: z.enum(["low", "medium", "high"]).optional(),
      folder: trimmedString("folder", 50).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required.",
    }),
};
