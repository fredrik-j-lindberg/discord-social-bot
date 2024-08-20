import path from "node:path";
import { fileURLToPath } from "url";
import fs from "node:fs";
import { DoraException } from "~/lib/exceptions/DoraException";
import { CommandInteraction, ModalSubmitInteraction } from "discord.js";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const importFolderModules = async <
  TDefaultExport extends { data: { name: string } },
>(
  folder: string,
): Promise<{ [name: string]: TDefaultExport }> => {
  const folderPath = path.join(__dirname, folder);
  try {
    const filesToImport = fs.readdirSync(folderPath);

    const modulesByName: Record<string, TDefaultExport> = {};
    for (const file of filesToImport) {
      const filePath = path.join(folderPath, file);
      const { default: defaultExport } = (await import(filePath)) as {
        default: TDefaultExport;
      };
      modulesByName[defaultExport.data.name] = defaultExport;
    }
    return modulesByName;
  } catch (err) {
    throw new DoraException(
      "Failed to import folder files dynamically",
      DoraException.Type.Unknown,
      { cause: err, metadata: { folderPath } },
    );
  }
};

type Data<TInteraction extends CommandInteraction | ModalSubmitInteraction> = {
  execute: (interaction: TInteraction) => Promise<void> | void;
  deferReply: boolean;
  interaction: TInteraction;
  context: "command" | "modal";
};
export const triggerExecutionMappedToInteraction = async <
  TInteraction extends CommandInteraction | ModalSubmitInteraction,
>({
  execute,
  deferReply,
  interaction,
  context,
}: Data<TInteraction>) => {
  if (deferReply) {
    await interaction.deferReply();
  }
  try {
    await execute(interaction);
  } catch (err) {
    let userFacingErrorMsg = `Failed to process ${context} :(`;
    if (err instanceof DoraUserException) {
      userFacingErrorMsg = err.message;
    }
    if (deferReply) {
      await interaction.editReply(userFacingErrorMsg);
      throw err;
    }
    await interaction.reply(userFacingErrorMsg);
    throw err;
  }
};
