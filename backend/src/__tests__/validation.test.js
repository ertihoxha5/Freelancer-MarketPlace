import { describe, expect, it } from "vitest";
import {
  authSchemas,
  milestoneSchemas,
  projectSchemas,
  proposalSchemas,
  reviewSchemas,
  userSchemas,
} from "../validation/schemas.js";
import { isCommonPassword } from "../validation/password.js";

const STRONG_PASSWORD = "SecurePass123!@";

describe("authentication validation", () => {
  it("normalizes login email and requires a password", () => {
    const result = authSchemas.login.parse({
      email: "  USER@Example.COM ",
      password: "Secret123",
    });

    expect(result.email).toBe("user@example.com");
  });

  it("rejects weak registration passwords", () => {
    expect(() =>
      userSchemas.register.parse({
        fullName: "Test User",
        email: "test@example.com",
        password: "password",
        roleID: 2,
      }),
    ).toThrow();
  });

  it("accepts strong registration passwords", () => {
    const result = userSchemas.register.parse({
      fullName: "Test User",
      email: "test@example.com",
      password: STRONG_PASSWORD,
      roleID: 2,
    });

    expect(result.password).toBe(STRONG_PASSWORD);
  });

  it("blocks common passwords", () => {
    expect(isCommonPassword("Password123!")).toBe(true);
    expect(() =>
      userSchemas.register.parse({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123!",
        roleID: 2,
      }),
    ).toThrow();
  });
});

describe("proposal workflow validation", () => {
  it("rejects negative proposal bids before persistence", () => {
    expect(() =>
      proposalSchemas.createOrUpdate.parse({
        coverLetter: "I can build this.",
        bidAmount: -50,
        estimatedDays: 3,
      }),
    ).toThrow();
  });

  it("only allows proposal status values used by the acceptance workflow", () => {
    expect(() =>
      proposalSchemas.status.parse({ propStatus: "completed" }),
    ).toThrow();
  });
});

describe("contract and milestone validation", () => {
  it("rejects non-positive milestone amounts", () => {
    expect(() =>
      milestoneSchemas.create.parse({
        title: "Design",
        mDesc: "Initial design",
        amountPayable: 0,
      }),
    ).toThrow();
  });
});

describe("review validation", () => {
  it("rejects out-of-range review ratings", () => {
    expect(() =>
      reviewSchemas.create.parse({
        stars: 6,
        comment: "This review has enough text.",
      }),
    ).toThrow();
  });
});

describe("project import validation", () => {
  it("normalizes project rows before import", () => {
    const result = projectSchemas.clientCreateOrUpdate.parse({
      title: "  Landing Page ",
      pDesc: "Build a page",
      budget: "250",
      deadline: "",
    });

    expect(result).toMatchObject({
      title: "Landing Page",
      budget: 250,
      deadline: null,
    });
  });
});
