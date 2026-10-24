import { describe, expect, it } from "vitest";
import { missingVariables, renderEmail } from "./templates";
import { EMAIL_TEMPLATES, emailRequestInputSchema } from "@/shared/formats";

describe("email templates", () => {
  it("renders every template with its link", () => {
    for (const template of EMAIL_TEMPLATES) {
      const email = renderEmail(template, { name: "Alex", userName: "Alex" }, ["https://app.test/x"]);
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.text).toContain("https://app.test/x");
      expect(email.html).toContain('href="https://app.test/x"');
    }
  });

  it("reports missing variables", () => {
    expect(missingVariables("rater-invite", {})).toEqual(["userName"]);
    expect(() => renderEmail("rater-invite", {}, ["https://app.test"])).toThrow(/userName/);
  });

  it("escapes HTML in variables", () => {
    const email = renderEmail("login-link", { name: "<script>" }, ["https://app.test"]);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("Email request format", () => {
  it("accepts a valid request and defaults variables", () => {
    const parsed = emailRequestInputSchema.parse({
      recipient: "rater@example.com",
      template: "rater-invite",
      links: ["https://app.test/rate/abc"],
      requestedBy: "assessment",
    });
    expect(parsed.variables).toEqual({});
  });

  it("rejects an unknown template and a missing link", () => {
    expect(() =>
      emailRequestInputSchema.parse({ recipient: "a@b.co", template: "nope", links: ["https://x.y"], requestedBy: "platform" }),
    ).toThrow();
    expect(() =>
      emailRequestInputSchema.parse({ recipient: "a@b.co", template: "login-link", links: [], requestedBy: "platform" }),
    ).toThrow();
  });
});
