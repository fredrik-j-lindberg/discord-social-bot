import {
  date,
  integer,
  pgTable,
  primaryKey,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// TODO: rename things related to the table to member something to better reflect that the data is specific to guild?
export const usersTable = pgTable(
  "member_data",
  {
    id: uuid("id").defaultRandom().notNull().unique(),
    guildId: varchar({ length: 255 }).notNull(),
    userId: varchar({ length: 255 }).notNull(),
    username: varchar({ length: 255 }).notNull(),
    displayName: varchar({ length: 255 }),
    firstName: varchar({ length: 255 }),
    birthday: date({ mode: "date" }),
    phoneNumber: varchar({ length: 255 }),
    email: varchar({ length: 255 }),
    height: integer(),
    switchFriendCode: varchar({ length: 255 }),
    pokemonTcgpFriendCode: varchar({ length: 255 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.guildId, table.userId] }),
  }),
);

export type UserDataPost = Omit<typeof usersTable.$inferInsert, "id">;

export type UserDataSelect = typeof usersTable.$inferSelect & {
  /** Optionally computed field on select */
  nextBirthday?: Date | null;
};

export type UserData = UserDataSelect & {
  /** Computed post-select */
  age: number | null;
};
