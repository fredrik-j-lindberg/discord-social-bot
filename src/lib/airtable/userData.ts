import { z, ZodSchema } from "zod";
import { DoraException } from "../exceptions/DoraException";
import { tables } from "./table";
import { UserDataPost } from "./types";
import { ukDateToIso } from "../helpers/date";

const userDataPostSchema: ZodSchema<UserDataPost> = z.object({
  guildId: z.string(),
  userId: z.string(),
  username: z.string(),
  nickname: z.string().optional().nullable(),
  firstName: z
    .string()
    .regex(/^[a-zA-ZäöåÄÖÅ]+$/)
    .optional()
    .nullable(),
  birthday: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional()
    .nullable(),
  phoneNumber: z.string().max(10).optional().nullable(),
  email: z
    .string()
    .regex(
      // https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
      // eslint-disable-next-line no-control-regex
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    )
    .optional()
    .nullable(),
  height: z.number().max(300).min(50).optional().nullable(),
});

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
  userData: Omit<UserDataPost, "userId" | "guildId">;
}) => {
  const record = await getByUserId(userId, guildId);
  const validatedUserData = userDataPostSchema.parse({
    ...userData,
    userId: userId,
    guildId: guildId,
  });

  const formattedUserData = {
    ...validatedUserData,
    birthday:
      validatedUserData.birthday && ukDateToIso(validatedUserData.birthday),
  };

  if (record) {
    // https://github.com/Airtable/airtable.js/issues/272
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    void tables.userData.update(record.id, formattedUserData);
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    void tables.userData.create(formattedUserData);
  }
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
