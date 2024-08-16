import Airtable, { Table } from "airtable";
import { AirtableBase } from "airtable/lib/airtable_base";
import { logger } from "../logger";
import { DoraException } from "../exceptions/DoraException";
import { env } from "~/env";
import { UserData } from "./types";

const tableIds = { userData: "user_data" };

export let base: AirtableBase;
type Tables = {
  userData: Table<UserData>;
};
export let tables: Tables;
export const initAirtable = async () => {
  try {
    Airtable.configure({
      endpointUrl: "https://api.airtable.com",
      apiKey: env.AIRTABLE_API_KEY,
    });
    base = Airtable.base("apprNJNQHQMYPO2Gg");
    tables = {
      userData: base(tableIds.userData),
    };
    await validateConnection();
    logger.info("Successfully loaded Airtable tables");
  } catch (error) {
    throw new DoraException(
      "Failed to initialize Airtable tables",
      DoraException.Type.Unknown,
      { cause: error },
    );
  }
};

/**
 * The authorization is not checked until the first call on a table
 * Therefore we validate that the setup is correct by executing a dummy query
 *
 * This allows us to early exit the bot if the connection is invalid, as the bot
 * will not work as expected without a valid connection
 */
const validateConnection = async () => {
  await tables.userData.select({ maxRecords: 1 }).firstPage();
};
