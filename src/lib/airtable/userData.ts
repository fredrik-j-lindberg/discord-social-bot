import { DoraException } from "../exceptions/DoraException";
import { tables } from "./table";
import { UserDataPost } from "./types";

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

export const setUserData = async ({ userData }: { userData: UserDataPost }) => {
  const record = await getByUserId(userData.userId, userData.guildId);

  if (record) {
    // https://github.com/Airtable/airtable.js/issues/272
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    await tables.userData.update(record.id, userData);
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    await tables.userData.create(userData);
  }
};

export const getUsersWithBirthdayToday = async () => {
  const records = await tables.userData
    .select({
      maxRecords: 10,
      view: "Grid view",
      filterByFormula: `{nextBirthday} = TODAY()`,
    })
    .firstPage();
  return records.map((record) => record.fields);
};

export const getUsersWithUpcomingBirthday = async (guildId: string) => {
  const records = await tables.userData
    .select({
      maxRecords: 10,
      view: "Grid view",
      filterByFormula: `AND({guildId} = '${guildId}', {birthday})`,
      sort: [{ field: "nextBirthday", direction: "asc" }],
    })
    .firstPage();
  return records.map((record) => record.fields);
};

export const getAllUsers = () => {
  return tables.userData.select({ view: "Grid view" }).all();
};
