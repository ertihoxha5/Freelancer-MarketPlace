import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "../utils/jwt.js";

describe("JWT security options", () => {
  it("signs and verifies tokens with issuer, audience, and expiry", () => {
    const token = signAccessToken({
      sub: 1,
      email: "test@example.com",
      roleID: 2,
      tokenVersion: 0,
    });

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(1);
    expect(decoded.iss).toBeDefined();
    expect(decoded.aud).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });
});
