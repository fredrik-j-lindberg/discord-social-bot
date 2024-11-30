/** Tempoarily routes between airtable and postgres */

import * as airtable from "~/lib/airtable/userData";
import * as postgres from "~/lib/database/userData";
import { DoraException } from "../exceptions/DoraException";
import { UserDataPost } from "./schema";
import { env } from "~/env";
import { logger } from "../logger";

export const getUserData = async ({
  userId,
  guildId,
}: {
  guildId: string;
  userId: string;
}) => {
  const postgresUserData = await postgres.getUserData({ guildId, userId });
  const airtableUserData = await airtable.getUserData(userId, guildId);

  if (!postgresUserData && Boolean(airtableUserData)) {
    logger.warn("User not found in postgres but found in airtable", {
      userId,
      guildId,
    });
  }
  if (
    postgresUserData &&
    postgresUserData.username !== airtableUserData?.username
  ) {
    throw new DoraException(
      "Usernames between databases do not match",
      DoraException.Type.UserFacing,
      { metadata: { userId, guildId } },
    );
  }
  return env.USE_POSTGRES ? postgresUserData : airtableUserData;
};

export const setUserData = async ({ userData }: { userData: UserDataPost }) => {
  await postgres.setUserData({
    userData,
  });
  await airtable.setUserData({
    userData: {
      ...userData,
      birthday: userData.birthday
        ? userData.birthday.toISOString().split("T")[0]
        : null,
    },
  });
};

export const getUsersWithBirthdayTodayForAllGuilds = async () => {
  const postgresUsers = await postgres.getUsersWithBirthdayTodayForAllGuilds();
  const airtableUsers = await airtable.getUsersWithBirthdayToday();

  return env.USE_POSTGRES ? postgresUsers : airtableUsers;
};

export const getUsersWithUpcomingBirthday = async ({
  guildId,
}: {
  guildId: string;
}) => {
  const postgresUsers = await postgres.getUsersWithUpcomingBirthday({
    guildId,
  });
  const airtableUsers = await airtable.getUsersWithUpcomingBirthday(guildId);

  return env.USE_POSTGRES ? postgresUsers : airtableUsers;
};
