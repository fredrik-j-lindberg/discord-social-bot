import {
  date,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const membersTable = pgTable(
  "member_data",
  {
    id: uuid("id").defaultRandom().notNull().unique(),
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
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId] })],
)

export type MemberDataPost = Omit<typeof membersTable.$inferInsert, "id">
/** The values which should be part of any update */
export type MemberDataPostCoreValues = Pick<
  MemberDataPost,
  "guildId" | "userId" | "username" | "displayName"
>

export type MemberDataSelect = typeof membersTable.$inferSelect & {
  /** Optionally computed field on select */
  nextBirthday?: Date | null
}

export type MemberData = MemberDataSelect & {
  /** Computed post-select */
  age: number | null
}
