import fs from "node:fs";
import path from "node:path";
import { DoraException } from "~/lib/exceptions/DoraException";

export const importFolderModules = async (folderPath: string) => {
  try {
    const filesToImport = fs.readdirSync(folderPath);

    const commandModules = [];
    for (const file of filesToImport) {
      const filePath = path.join(folderPath, file);
      const command = (await import(filePath)) as {
        default: unknown;
      };
      commandModules.push(command.default);
    }
    return commandModules;
  } catch (err) {
    throw new DoraException(
      "Failed to import folder files dynamically",
      DoraException.Type.Unknown,
      { cause: err, metadata: { folderPath } },
    );
  }
};
