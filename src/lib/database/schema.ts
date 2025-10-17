import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

const commonTimestamps = {
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
    latestActivityAt: timestamp({ mode: "date" }),
    /** If the member is marked as inactive, this timestamp will be set */
    inactiveSince: timestamp({ mode: "date" }),

    firstName: varchar({ length: 255 }),
    birthday: date({ mode: "date" }),
    phoneNumber: varchar({ length: 255 }),
    email: varchar({ length: 255 }),
    height: integer(), // Legacy, just kept in case we want to re-implement it
    switchFriendCode: varchar({ length: 255 }),
    pokemonTcgpFriendCode: varchar({ length: 255 }),
    dietaryPreferences: varchar({ length: 255 }),

    ...commonTimestamps,
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId] })],
)

export const membersRelations = relations(membersTable, ({ many }) => ({
  roles: many(memberRolesTable),
  emojis: many(memberEmojisTable),
}))

export type MemberDataRecordInsert = Omit<
  typeof membersTable.$inferInsert,
  "id"
>
/** The values which should be part of any update */
export type MemberDataRecordPostCoreValues = Pick<
  MemberDataRecordInsert,
  "guildId" | "userId" | "username" | "displayName"
>

export type MemberDataRecord = typeof membersTable.$inferSelect
export type MemberDataDbKeys = keyof MemberDataRecord

export const memberRolesTable = pgTable(
  "member_role",
  {
    id: uuid().defaultRandom().notNull().unique(),
    memberId: uuid()
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    roleId: varchar({ length: 255 }).notNull(),

    ...commonTimestamps,
  },
  (table) => [primaryKey({ columns: [table.memberId, table.roleId] })],
)

export const memberRolesRelations = relations(memberRolesTable, ({ one }) => ({
  member: one(membersTable, {
    fields: [memberRolesTable.memberId],
    references: [membersTable.id],
  }),
}))

export type MemberRoleRecord = typeof memberRolesTable.$inferSelect
export type MemberRoleRecordInsert = typeof memberRolesTable.$inferInsert

export const emojisUsageEnum = pgEnum("context", ["reaction", "message"])

export const memberEmojisTable = pgTable("member_emojis", {
  id: uuid().defaultRandom().notNull().unique().primaryKey(),
  memberId: uuid()
    .notNull()
    .references(() => membersTable.id),
  /** The id of the emoji, nullable since native unicode emojis do not have an id */
  emojiId: varchar({ length: 255 }),
  emojiName: varchar({ length: 255 }).notNull(),
  isAnimated: boolean().notNull().default(false),
  guildId: varchar({ length: 255 }).notNull(),
  /** The timestamp when the emoji was used */
  timestamp: timestamp({ mode: "date" }).notNull(),
  /** The user id of the message that received the reaction, or the message that contained the emoji */
  messageAuthorUserId: varchar({ length: 255 }).notNull(),
  /** The id of the message that received the reaction, or that contained the emoji */
  messageId: varchar({ length: 255 }).notNull(),
  /** Whether or not the emoji exists on the server itself */
  isGuildEmoji: boolean().notNull(),
  /** In which context the emoji was used. E.g. reaction or in a message */
  context: emojisUsageEnum().notNull(),

  ...commonTimestamps,
})

export const memberEmojisRelations = relations(
  memberEmojisTable,
  ({ one }) => ({
    member: one(membersTable, {
      fields: [memberEmojisTable.memberId],
      references: [membersTable.id],
    }),
  }),
)

export type MemberEmojiRecord = typeof memberEmojisTable.$inferSelect
export type MemberEmojiRecordInsert = typeof memberEmojisTable.$inferInsert
