import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { photos } from "../drizzle/schema";
import { eq, asc } from "drizzle-orm";
import { storagePut, storageDelete } from "./storage";
import { nanoid } from "nanoid";
import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

// Teacher password — stored server-side, never exposed to client
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "showcase2024";

// Max photos per student
const MAX_PHOTOS = 9;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  photos: router({
    // List all photos for a student
    list: publicProcedure
      .input(z.object({ studentSlug: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const rows = await db
          .select()
          .from(photos)
          .where(eq(photos.studentSlug, input.studentSlug))
          .orderBy(asc(photos.createdAt));
        return rows;
      }),

    // Upload a photo — accepts base64 encoded image
    upload: publicProcedure
      .input(
        z.object({
          studentSlug: z.string(),
          studentName: z.string(),
          base64: z.string(),
          mimeType: z.string(),
          originalName: z.string().optional(),
          fileSize: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Check current count
        const existing = await db
          .select({ id: photos.id })
          .from(photos)
          .where(eq(photos.studentSlug, input.studentSlug));

        if (existing.length >= MAX_PHOTOS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Gallery is full (max ${MAX_PHOTOS} photos). Ask a teacher to delete one first.`,
          });
        }

        // Decode base64
        const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Generate a unique key
        const ext = input.mimeType.split("/")[1] || "jpg";
        const fileKey = `student-showcase/${input.studentSlug}/${nanoid()}.${ext}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Save to DB
        await db.insert(photos).values({
          studentSlug: input.studentSlug,
          studentName: input.studentName,
          fileKey,
          url,
          originalName: input.originalName ?? null,
          mimeType: input.mimeType,
          fileSize: input.fileSize ?? null,
        });

        return { success: true, url };
      }),

    // Delete a photo — requires teacher password
    delete: publicProcedure
      .input(
        z.object({
          photoId: z.number(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.password !== TEACHER_PASSWORD) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Incorrect teacher password" });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const rows = await db.select().from(photos).where(eq(photos.id, input.photoId)).limit(1);
        if (rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
        }

        const photo = rows[0];

        // Delete from S3
        try {
          await storageDelete(photo.fileKey);
        } catch (err) {
          console.error("S3 delete failed:", err);
        }

        // Delete from DB
        await db.delete(photos).where(eq(photos.id, photo.id));

        return { success: true };
      }),

    // Verify teacher password (used by frontend to unlock teacher mode)
    verifyTeacher: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== TEACHER_PASSWORD) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Incorrect teacher password" });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
