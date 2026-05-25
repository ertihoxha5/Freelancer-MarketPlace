import { z } from "zod";

/** Common passwords blocked regardless of complexity rules. */
const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "password12",
    "password123",
    "password123!",
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty",
    "qwerty123",
    "abc123",
    "letmein",
    "welcome",
    "welcome1",
    "admin",
    "admin123",
    "iloveyou",
    "monkey",
    "dragon",
    "master",
    "login",
    "princess",
    "football",
    "shadow",
    "sunshine",
    "trustno1",
    "freelancer",
    "freelancer1",
    "changeme",
    "changeme123",
    "Password1",
    "Password12",
    "Password123",
    "Password123!",
  ].map((p) => p.toLowerCase()),
);

export function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(String(password).toLowerCase());
}

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one symbol (non-alphanumeric character).",
  )
  .refine((value) => !isCommonPassword(value), {
    message: "This password is too common. Choose a stronger password.",
  });
