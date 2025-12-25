import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  integer,
  jsonb,
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

const memberStatuses = [
  /** In guild and active */
  "active",
  /** In guild but marked as inactive */
  "inactive",
  /** No longer in guild */
  "departed",
] as const
export type MemberStatus = (typeof memberStatuses)[number]
export const memberStatusEnum = pgEnum("member_status", memberStatuses)

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

    status: memberStatusEnum().notNull().default("active"),

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

export const memberFilesTable = pgTable("member_files", {
  id: uuid().defaultRandom().notNull().unique().primaryKey(),
  name: varchar({ length: 1024 }).notNull(),
  /** The content type / mime type of the file. E.g. image/png */
  contentType: varchar({ length: 255 }),
  url: varchar({ length: 2048 }).notNull(),
  sizeInBytes: integer().notNull(),
  /** Member who uploaded the file */
  memberId: uuid().notNull(),
  guildId: varchar({ length: 255 }).notNull(),

  ...commonTimestamps,
})

export const memberFilesRelations = relations(memberFilesTable, ({ many }) => ({
  itemTags: many(itemTagsTable),
}))

export type MemberFileRecord = typeof memberFilesTable.$inferSelect
export type MemberFileRecordInsert = typeof memberFilesTable.$inferInsert

/** The table containing all tags, meant to be used for categorizing various items */
export const tagsTable = pgTable(
  "tags",
  {
    id: uuid().defaultRandom().notNull().unique(),
    guildId: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    /** The type of the tag. E.g. "media" if it is meant to be used for media */
    type: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 4000 }),

    ...commonTimestamps,
  },
  (table) => [primaryKey({ columns: [table.guildId, table.name, table.type] })],
)

export const tagRelations = relations(tagsTable, ({ many }) => ({
  items: many(itemTagsTable),
}))

export type TagRecord = typeof tagsTable.$inferSelect
export type TagRecordInsert = typeof tagsTable.$inferInsert

/** The table linking items (files) to tags */
export const itemTagsTable = pgTable("item_tags", {
  id: uuid().defaultRandom().notNull().unique().primaryKey(),
  /** The id of the item (content etc) linked to the tag */
  itemId: uuid().notNull(),
  tagId: uuid()
    .notNull()
    .references(() => tagsTable.id, { onDelete: "cascade" }),

  ...commonTimestamps,
})

export const itemTagRelations = relations(itemTagsTable, ({ one }) => ({
  tag: one(tagsTable, {
    fields: [itemTagsTable.tagId],
    references: [tagsTable.id],
  }),
  item: one(memberFilesTable, {
    fields: [itemTagsTable.itemId],
    references: [memberFilesTable.id],
  }),
}))

/** The table containing guild configurations that can be updated dynamically */
export const guildConfigsTable = pgTable("guild_configs", {
  id: uuid().defaultRandom().notNull().unique().primaryKey(),
  guildId: varchar({ length: 255 }).notNull().unique(),

  /**
   * JSONB field containing the entire guild configuration.
   * Extract relevant fields if there is a need for querying purposes. Otherwise this field allows for flexibility and nesting and generally don't benefit much from normalization
   * The data is being validated when reading from and writing to the database.
   */
  config: jsonb(),

  ...commonTimestamps,
})

export type GuildConfigRecord = typeof guildConfigsTable.$inferSelect
export type GuildConfigRecordInsert = typeof guildConfigsTable.$inferInsert
