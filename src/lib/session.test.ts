import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./session";
import { isValidTransition } from "@/shared/roles";

describe("session tokens", () => {
  it("round-trips the user id", async () => {
    const token = await createSessionToken("user-123");
    expect(await readSessionToken(token)).toBe("user-123");
  });

  it("rejects missing and tampered tokens", async () => {
    const token = await createSessionToken("user-123");
    expect(await readSessionToken(undefined)).toBeNull();
    // Swap the payload for one claiming another user; the signature no longer matches.
    const forged = token.replace(/\.[^.]+\./, ".eyJzdWIiOiJvdGhlciJ9.");
    expect(forged).not.toBe(token);
    expect(await readSessionToken(forged)).toBeNull();
  });
});

describe("role transitions", () => {
  it("allows the same level or higher, not lower", () => {
    expect(isValidTransition("VP", "C-level")).toBe(true);
    expect(isValidTransition("VP", "VP")).toBe(true);
    expect(isValidTransition("C-level", "Director")).toBe(false);
  });
});
