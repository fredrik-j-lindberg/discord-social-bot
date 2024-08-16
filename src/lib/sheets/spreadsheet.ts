import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { env } from "~/env";
import { DoraException } from "../exceptions/DoraException";
import { logger } from "../logger";

const credential = JSON.parse(
  Buffer.from(env.GOOGLE_SERVICE_KEY, "base64").toString(),
) as {
  client_email: string;
  private_key: string;
};
const serviceAccountAuth = new JWT({
  email: credential.client_email,
  key: credential.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// https://docs.google.com/spreadsheets/d/1-99z7M9WhoFlzG-29gviIXKbR3Pv5JR5TDeVLKCgI_A
const spreadsheetId = "1-99z7M9WhoFlzG-29gviIXKbR3Pv5JR5TDeVLKCgI_A";
const sheetTitles = { userData: "user_data" };
export const spreadsheet = new GoogleSpreadsheet(
  spreadsheetId,
  serviceAccountAuth,
);

type Sheets = {
  userData: GoogleSpreadsheetWorksheet;
};
export let sheets: Sheets;
export const initSpreadsheet = async () => {
  try {
    await spreadsheet.loadInfo(); // loads document properties and worksheets
    logger.info("Sheet - Successfully loaded Google spreadsheet");

    const userDataSheet = spreadsheet.sheetsByTitle[sheetTitles.userData];
    if (!userDataSheet) {
      throw new DoraException(
        "User data sheet was not found",
        DoraException.Type.NotFound,
      );
    }
    sheets = {
      userData: userDataSheet,
    };
    logger.info("Sheet - Worksheets successfully loaded");
  } catch (error) {
    throw new DoraException(
      "Failed to initialize Google spreadsheet",
      DoraException.Type.Unknown,
      { cause: error },
    );
  }
};
