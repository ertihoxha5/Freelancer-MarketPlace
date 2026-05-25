import { describe, expect, it, beforeEach } from "vitest";
import {
  _resetLockoutStore,
  clearFailedLogins,
  isAccountLocked,
  recordFailedLogin,
} from "../security/accountLockout.js";

describe("account lockout", () => {
  beforeEach(() => {
    _resetLockoutStore();
  });

  it("locks account after five failed attempts", () => {
    const email = "user@example.com";

    for (let i = 0; i < 5; i++) {
      recordFailedLogin(email);
    }

    expect(isAccountLocked(email)).toBe(true);
  });

  it("clears lockout after successful login tracking reset", () => {
    const email = "locked@example.com";

    for (let i = 0; i < 5; i++) {
      recordFailedLogin(email);
    }

    clearFailedLogins(email);
    expect(isAccountLocked(email)).toBe(false);
  });
});
