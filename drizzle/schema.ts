import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Photos table — stores one row per uploaded photo
export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  /** Slug-form of the student name, e.g. "alice-chen" */
  studentSlug: varchar("studentSlug", { length: 128 }).notNull(),
  /** Display name of the student */
  studentName: varchar("studentName", { length: 256 }).notNull(),
  /** S3 file key for deletion */
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  /** Public CDN URL */
  url: text("url").notNull(),
  /** Original filename */
  originalName: varchar("originalName", { length: 256 }),
  /** MIME type */
  mimeType: varchar("mimeType", { length: 64 }),
  /** File size in bytes */
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;