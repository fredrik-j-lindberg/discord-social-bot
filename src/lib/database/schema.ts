import { relations } from "drizzle-orm"
import {
  date,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

const timestamps = {
  recordUpdatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  recordCreatedAt: timestamp().defaultNow().notNull(),
}

export const membersTable = pgTable(
  "member_data",
  {
    id: uuid().defaultRandom().notNull().unique(),
    guildId: varchar({ length: 255 }).notNull(),
    userId: varchar({ length: 255 }).notNull(),
    username: varchar({ length: 255 }).notNull(),
    displayName: varchar({ length: 255 }),

    messageCount: integer().default(0).notNull(),
    latestMessageAt: timestamp({ mode: "date" }),
    reactionCount: integer().default(0).notNull(),
    latestReactionAt: timestamp({ mode: "date" }),

    firstName: varchar({ length: 255 }),
    birthday: date({ mode: "date" }),
    phoneNumber: varchar({ length: 255 }),
    email: varchar({ length: 255 }),
    height: integer(), // Legacy, just kept in case we want to re-implement it
    switchFriendCode: varchar({ length: 255 }),
    pokemonTcgpFriendCode: varchar({ length: 255 }),
    dietaryPreferences: varchar({ length: 255 }),

    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId] })],
)

export const memberRolesTable = pgTable(
  "member_role",
  {
    id: uuid().defaultRandom().notNull().unique(),
    memberId: uuid()
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    roleId: varchar({ length: 255 }).notNull(),

    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.memberId, table.roleId] })],
)

export const membersRelations = relations(membersTable, ({ many }) => ({
  roles: many(memberRolesTable),
}))

export const memberRolesRelations = relations(memberRolesTable, ({ one }) => ({
  member: one(membersTable, {
    fields: [memberRolesTable.memberId],
    references: [membersTable.id],
  }),
}))

export type MemberRoleRecord = typeof memberRolesTable.$inferSelect
export type MemberRoleRecordInsert = typeof memberRolesTable.$inferInsert

export type MemberDataRecordPost = Omit<typeof membersTable.$inferInsert, "id">
/** The values which should be part of any update */
export type MemberDataRecordPostCoreValues = Pick<
  MemberDataRecordPost,
  "guildId" | "userId" | "username" | "displayName"
>

export type MemberDataRecordSelect = typeof membersTable.$inferSelect
export type MemberDataDbKeys = keyof MemberDataRecordSelect
