import { describe, it, expect } from "vitest";

describe("API Secrets Validation", () => {
  it("should have GEMINI_API_KEY configured", () => {
    const geminiKey = process.env.GEMINI_API_KEY;
    expect(geminiKey).toBeDefined();
    expect(geminiKey).toBeTruthy();
    expect(typeof geminiKey).toBe("string");
  });

  it("should have RESEND_API_KEY configured", () => {
    const resendKey = process.env.RESEND_API_KEY;
    expect(resendKey).toBeDefined();
    expect(resendKey).toBeTruthy();
    expect(typeof resendKey).toBe("string");
    expect(resendKey).toMatch(/^re_/);
  });

  it("GEMINI_API_KEY should be a valid format", () => {
    const geminiKey = process.env.GEMINI_API_KEY;
    // Gemini API keys are typically long alphanumeric strings
    expect(geminiKey).toHaveLength(39);
  });

  it("RESEND_API_KEY should start with re_", () => {
    const resendKey = process.env.RESEND_API_KEY;
    expect(resendKey).toMatch(/^re_/);
  });
});
