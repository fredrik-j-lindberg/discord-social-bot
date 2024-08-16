import { DoraException } from "../exceptions/DoraException";
import { tables } from "./table";
import { UserData } from "./types";

// https://airtable.com/apprNJNQHQMYPO2Gg/tblxWYOeTPjfwyl3m/viwOl6KDtl6yUVm2K?blocks=hide

const getByUserId = async (userId: string, guildId: string) => {
  const records = await tables.userData
    .select({
      maxRecords: 2,
      view: "Grid view",
      filterByFormula: `AND({user_id} = '${userId}', {guild_id} = '${guildId}')`,
    })
    .firstPage();
  if (records.length === 0) return;
  if (records.length > 1) {
    throw new DoraException(
      "Multiple records found",
      DoraException.Type.Unknown,
      { metadata: { userId, guildId } },
    );
  }
  return records[0];
};

export const getUserData = async (userId: string, guildId: string) => {
  const record = await getByUserId(userId, guildId);
  if (!record) return;
  return record.fields;
};

export const setUserData = async ({
  userId,
  guildId,
  userData,
}: {
  userId: string;
  guildId: string;
  userData: Omit<UserData, "user_id" | "guild_id">;
}) => {
  const record = await getByUserId(userId, guildId);
  const fullUserData = { ...userData, user_id: userId, guild_id: guildId };
  if (record) {
    await tables.userData.update(record.id, fullUserData);
  } else {
    await tables.userData.create(fullUserData);
  }
};

export const getUsersWithUpcomingBirthday = async (guildId: string) => {
  const records = await tables.userData
    .select({
      maxRecords: 10,
      view: "Grid view",
      filterByFormula: `{guild_id} = '${guildId}'`,
      sort: [{ field: "birthday", direction: "desc" }],
    })
    .firstPage();
  return records.map((record) => record.fields);
};
