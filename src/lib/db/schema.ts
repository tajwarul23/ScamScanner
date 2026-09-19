
import { relations  } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import {type ExtractionResult } from "../pipeline/extractEvidence";
import { Signal } from "../pipeline/ruleSignalEngine";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const statusEnum = pgEnum("status_enum", [
  "processing",
  "finalizing",
  "ready",
  "failed",
]);
export const riskEnum = pgEnum("risk_enum", ["low", "medium", "high"]);
export const extractionEnum = pgEnum("extraction_enum", [
  "pending",
  "success",
  "error",
  "skipped",
]);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    context: text("context"),
    status: statusEnum("status").default("processing").notNull(),
    riskLevel: riskEnum("risk"),
    signals: jsonb("signals").$type<Signal[]>(),
    summary: text("summary"),
    verifySteps: jsonb("verify_steps").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_cases_userId").on(table.userId)],
);

export const evidenceItems = pgTable("evidence_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"),
  mimeType: text("mimeType").notNull(),
  extractionStatus: extractionEnum("extraction_status")
    .default("pending")
    .notNull(),
  extractedData: jsonb("extracted_data").$type<ExtractionResult>(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("idx_evidence_items_caseId").on(table.caseId)],)

//one case belongs to exactly one user
//one case can have multiple evidenceItem
export const caseRelations = relations(cases, ({one, many}) => ({
  user: one(user, {
    fields:[cases.userId],
    references:[user.id]
  }),
  evidenceItems: many(evidenceItems)
}))

//one evidence item belongs to exactly one case
export const evidenceItemsRelations = relations(evidenceItems, ({one}) =>({
  case: one(cases, {
    fields:[evidenceItems.caseId],
    references:[cases.id]
  })
}))
//one user can have multiple case
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  cases: many(cases)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
