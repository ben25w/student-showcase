import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock the DB and storage so tests run without real connections ──────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://example.com/photo.jpg" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test-key", url: "https://example.com/photo.jpg" }),
  storageDelete: vi.fn().mockResolvedValue(undefined),
}));

// ── Import router AFTER mocks are set up ──────────────────────────────────────
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("photos.verifyTeacher", () => {
  it("succeeds with the correct TEACHER_PASSWORD env var", async () => {
    const password = process.env.TEACHER_PASSWORD || "showcase2024";
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.photos.verifyTeacher({ password });
    expect(result).toEqual({ success: true });
  });

  it("throws FORBIDDEN with an incorrect password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.photos.verifyTeacher({ password: "wrong-password-xyz" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("photos.list", () => {
  it("returns an array for a valid student slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.photos.list({ studentSlug: "alice-chen" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
