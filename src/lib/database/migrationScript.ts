import { initAirtable } from "../airtable/table";
import { getAllUsers } from "../airtable/userData";
import { initDatabase } from "./client";
import { setUserData } from "./userData";

await Promise.all([initAirtable(), initDatabase()]);
const records = await getAllUsers();
const users = records.map((record) => record.fields);
for (const userData of users) {
  await setUserData({
    userData: {
      ...userData,
      birthday: userData.birthday ? new Date(userData.birthday) : undefined,
    },
  });
}
