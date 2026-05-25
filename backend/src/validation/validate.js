import { ZodError } from "zod";
import { validationError } from "../utils/errors.js";

export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  throw validationError(formatZodError(result.error));
}

export function formatZodError(error) {
  if (!(error instanceof ZodError)) {
    return "Invalid input.";
  }

  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join(" ");
}
