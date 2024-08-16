import { DoraException } from "../exceptions/DoraException";
import { tables } from "./table";
import { UserData } from "./types";

// https://airtable.com/apprNJNQHQMYPO2Gg/tblxWYOeTPjfwyl3m/viwOl6KDtl6yUVm2K?blocks=hide

const getByUserId = async (userId: string, guildId: string) => {
  const records = await tables.userData
    .select({
      maxRecords: 2,
      view: "Grid view",
      filterByFormula: `AND({userId} = '${userId}', {guildId} = '${guildId}')`,
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
  userData: Omit<UserData, "userId" | "guildId">;
}) => {
  const record = await getByUserId(userId, guildId);
  const fullUserData = { ...userData, userId: userId, guildId: guildId };
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
      filterByFormula: `{guildId} = '${guildId}'`,
      sort: [{ field: "nextBirthday", direction: "asc" }],
    })
    .firstPage();
  return records.map((record) => record.fields);
};
