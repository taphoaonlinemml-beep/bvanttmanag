import { boolean, char, datetime, foreignKey, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  username: varchar("username", { length: 80 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  passwordUpdatedAt: timestamp("passwordUpdatedAt"),
  role: mysqlEnum("role", ["user", "leader", "admin"]).default("user").notNull(),
  assignedWardId: int("assignedWardId"),
  canEditPersonnel: boolean("canEditPersonnel").default(false).notNull(),
  adminPermissions: text("adminPermissions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [
  index("users_assigned_ward_idx").on(table.assignedWardId),
  foreignKey({ columns: [table.assignedWardId], foreignColumns: [units.id], name: "users_assigned_ward_fk" }).onDelete("set null"),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const units = mysqlTable(
  "units",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    unitType: mysqlEnum("unitType", ["province", "district", "ward", "team", "other"])
      .default("ward")
      .notNull(),
    parentId: int("parentId"),
    maxMembers: int("maxMembers").default(0).notNull(),
    address: text("address"),
    isActive: mysqlEnum("isActive", ["active", "inactive"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("units_code_unique").on(table.code),
    index("units_parent_idx").on(table.parentId),
    foreignKey({ columns: [table.parentId], foreignColumns: [table.id], name: "units_parent_fk" }).onDelete("restrict"),
  ],
);

export const mobileSyncTokens = mysqlTable(
  "mobileSyncTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    label: varchar("label", { length: 120 }).notNull(),
    tokenHash: char("tokenHash", { length: 64 }).notNull(),
    wardId: int("wardId"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastUsedAt: timestamp("lastUsedAt"),
    revokedAt: timestamp("revokedAt"),
  },
  table => [
    uniqueIndex("mobile_sync_tokens_hash_unique").on(table.tokenHash),
    index("mobile_sync_tokens_ward_idx").on(table.wardId),
    index("mobile_sync_tokens_active_idx").on(table.revokedAt),
    foreignKey({ columns: [table.wardId], foreignColumns: [units.id], name: "mobile_sync_tokens_ward_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.createdByUserId], foreignColumns: [users.id], name: "mobile_sync_tokens_creator_fk" }).onDelete("restrict"),
  ],
);

export const mobileSyncLogs = mysqlTable(
  "mobileSyncLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenId: int("tokenId").notNull(),
    wardId: int("wardId"),
    statusCode: int("statusCode").notNull(),
    unitCount: int("unitCount").default(0).notNull(),
    personnelCount: int("personnelCount").default(0).notNull(),
    errorCode: varchar("errorCode", { length: 80 }),
    ipAddress: varchar("ipAddress", { length: 64 }),
    userAgent: varchar("userAgent", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("mobile_sync_logs_token_idx").on(table.tokenId),
    index("mobile_sync_logs_ward_idx").on(table.wardId),
    index("mobile_sync_logs_created_idx").on(table.createdAt),
    foreignKey({ columns: [table.tokenId], foreignColumns: [mobileSyncTokens.id], name: "mobile_sync_logs_token_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.wardId], foreignColumns: [units.id], name: "mobile_sync_logs_ward_fk" }).onDelete("restrict"),
  ],
);

export const personnel = mysqlTable(
  "personnel",
  {
    id: int("id").autoincrement().primaryKey(),
    fullName: varchar("fullName", { length: 255 }).notNull(),
    dateOfBirth: datetime("dateOfBirth", { mode: "date" }),
    gender: mysqlEnum("gender", ["male", "female", "other"]),
    citizenId: varchar("citizenId", { length: 20 }),
    phone: varchar("phone", { length: 24 }),
    address: text("address"),
    village: varchar("village", { length: 255 }),
    ethnicity: varchar("ethnicity", { length: 100 }),
    religion: varchar("religion", { length: 100 }),
    educationLevel: varchar("educationLevel", { length: 255 }),
    position: varchar("position", { length: 255 }),
    unitId: int("unitId").references(() => units.id, { onDelete: "restrict" }),
    joinedFormerForceAt: timestamp("joinedFormerForceAt"),
    joinedAt: timestamp("joinedAt"),
    leftFormerForceAt: timestamp("leftFormerForceAt"),
    leftAt: timestamp("leftAt"),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    policyResult: text("policyResult"),
    certificateNumber: varchar("certificateNumber", { length: 100 }),
    commendation: text("commendation"),
    classification: varchar("classification", { length: 100 }),
    classificationDecision: varchar("classificationDecision", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("personnel_name_idx").on(table.fullName),
    index("personnel_unit_idx").on(table.unitId),
    index("personnel_status_idx").on(table.status),
    index("personnel_position_idx").on(table.position),
  ],
);

export const personnelFiles = mysqlTable(
  "personnelFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    personnelId: int("personnelId")
      .notNull()
      .references(() => personnel.id, { onDelete: "cascade" }),
    fileType: mysqlEnum("fileType", ["portrait", "recruitment_decision", "resignation_decision", "other"])
      .notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 150 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("personnel_files_personnel_idx").on(table.personnelId),
    index("personnel_files_type_idx").on(table.fileType),
  ],
);

export const personnelCommendations = mysqlTable(
  "personnelCommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    personnelId: int("personnelId").notNull(),
    awardType: mysqlEnum("awardType", ["certificate_collective", "certificate_individual", "letter_collective", "letter_individual"]).notNull(),
    decisionNumber: varchar("decisionNumber", { length: 150 }).notNull(),
    issuedAt: datetime("issuedAt", { mode: "date" }).notNull(),
    issuingAgency: varchar("issuingAgency", { length: 255 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("personnel_commendations_personnel_idx").on(table.personnelId),
    index("personnel_commendations_issued_idx").on(table.issuedAt),
    index("personnel_commendations_type_idx").on(table.awardType),
    foreignKey({ columns: [table.personnelId], foreignColumns: [personnel.id], name: "pc_personnel_fk" }).onDelete("cascade"),
  ],
);

export const personnelCommendationFiles = mysqlTable(
  "personnelCommendationFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    commendationId: int("commendationId").notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 150 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("personnel_commendation_files_commendation_idx").on(table.commendationId),
    foreignKey({ columns: [table.commendationId], foreignColumns: [personnelCommendations.id], name: "pcf_commendation_fk" }).onDelete("cascade"),
  ],
);

export const personnelTrainings = mysqlTable(
  "personnelTrainings",
  {
    id: int("id").autoincrement().primaryKey(),
    personnelId: int("personnelId").notNull(),
    trainingName: varchar("trainingName", { length: 255 }).notNull(),
    decisionNumber: varchar("decisionNumber", { length: 150 }).notNull(),
    issuedAt: datetime("issuedAt", { mode: "date" }).notNull(),
    issuingAgency: varchar("issuingAgency", { length: 255 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("personnel_trainings_personnel_idx").on(table.personnelId),
    index("personnel_trainings_issued_idx").on(table.issuedAt),
    foreignKey({ columns: [table.personnelId], foreignColumns: [personnel.id], name: "pt_personnel_fk" }).onDelete("cascade"),
  ],
);

export const personnelTrainingFiles = mysqlTable(
  "personnelTrainingFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    trainingId: int("trainingId").notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 150 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("personnel_training_files_training_idx").on(table.trainingId),
    foreignKey({ columns: [table.trainingId], foreignColumns: [personnelTrainings.id], name: "ptf_training_fk" }).onDelete("cascade"),
  ],
);

export const deletionRequests = mysqlTable(
  "deletionRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    personnelId: int("personnelId"),
    personnelName: varchar("personnelName", { length: 255 }).notNull(),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "rejected", "executed"]).default("pending").notNull(),
    requesterUserId: int("requesterUserId").references(() => users.id, { onDelete: "set null" }),
    reviewerUserId: int("reviewerUserId").references(() => users.id, { onDelete: "set null" }),
    decisionNote: text("decisionNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
    executedAt: timestamp("executedAt"),
  },
  table => [
    index("deletion_requests_status_idx").on(table.status),
    index("deletion_requests_personnel_idx").on(table.personnelId),
    index("deletion_requests_requester_idx").on(table.requesterUserId),
    foreignKey({ columns: [table.personnelId], foreignColumns: [personnel.id], name: "deletion_requests_personnel_fk" }).onDelete("set null"),
  ],
);

export const deletionRequestFiles = mysqlTable(
  "deletionRequestFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    deletionRequestId: int("deletionRequestId")
      .notNull()
      .references(() => deletionRequests.id, { onDelete: "cascade" }),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 150 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("deletion_request_files_request_idx").on(table.deletionRequestId),
  ],
);

export const backupLogs = mysqlTable(
  "backupLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    actionType: mysqlEnum("actionType", ["backup", "restore", "import", "export"]).notNull(),
    status: mysqlEnum("status", ["success", "failed"]).notNull(),
    fileName: varchar("fileName", { length: 255 }),
    storageKey: varchar("storageKey", { length: 512 }),
    notes: text("notes"),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("backup_logs_action_idx").on(table.actionType),
    index("backup_logs_actor_idx").on(table.actorUserId),
  ],
);

export const editAccessRequests = mysqlTable(
  "editAccessRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterUserId: int("requesterUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    wardId: int("wardId").notNull().references(() => units.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    reviewerUserId: int("reviewerUserId").references(() => users.id, { onDelete: "set null" }),
    decisionNote: text("decisionNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  table => [
    index("edit_access_requests_status_idx").on(table.status),
    index("edit_access_requests_requester_idx").on(table.requesterUserId),
    index("edit_access_requests_ward_idx").on(table.wardId),
  ],
);

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;
export type Personnel = typeof personnel.$inferSelect;
export type InsertPersonnel = typeof personnel.$inferInsert;
export type PersonnelFile = typeof personnelFiles.$inferSelect;
export type InsertPersonnelFile = typeof personnelFiles.$inferInsert;
export type PersonnelCommendation = typeof personnelCommendations.$inferSelect;
export type InsertPersonnelCommendation = typeof personnelCommendations.$inferInsert;
export type PersonnelCommendationFile = typeof personnelCommendationFiles.$inferSelect;
export type InsertPersonnelCommendationFile = typeof personnelCommendationFiles.$inferInsert;
export type PersonnelTraining = typeof personnelTrainings.$inferSelect;
export type InsertPersonnelTraining = typeof personnelTrainings.$inferInsert;
export type PersonnelTrainingFile = typeof personnelTrainingFiles.$inferSelect;
export type InsertPersonnelTrainingFile = typeof personnelTrainingFiles.$inferInsert;
export type DeletionRequest = typeof deletionRequests.$inferSelect;
export type InsertDeletionRequest = typeof deletionRequests.$inferInsert;
export type DeletionRequestFile = typeof deletionRequestFiles.$inferSelect;
export type InsertDeletionRequestFile = typeof deletionRequestFiles.$inferInsert;
export type EditAccessRequest = typeof editAccessRequests.$inferSelect;
export type InsertEditAccessRequest = typeof editAccessRequests.$inferInsert;
export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = typeof backupLogs.$inferInsert;
