import path from "node:path";
import { fileURLToPath } from "url";
import fs from "node:fs";
import { DoraException } from "~/lib/exceptions/DoraException";
import {
  CommandInteraction,
  InteractionReplyOptions,
  ModalSubmitInteraction,
} from "discord.js";
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

const reply = async ({
  interaction,
  deferReply,
  replyOptions,
}: {
  interaction: RouterInteraction;
  deferReply: boolean;
  replyOptions: InteractionReplyOptions | string;
}) => {
  if (deferReply) {
    await interaction.editReply(replyOptions);
    return;
  }
  await interaction.reply(replyOptions);
};

type RouterInteraction = CommandInteraction | ModalSubmitInteraction;
type ExecuteResult = InteractionReplyOptions | string | undefined;
export type RouterInteractionExecute<TInteraction extends RouterInteraction> = (
  interaction: TInteraction,
) => Promise<ExecuteResult> | ExecuteResult;
type Data<TInteraction extends RouterInteraction> = {
  execute: RouterInteractionExecute<TInteraction>;
  deferReply: boolean;
  interaction: TInteraction;
  context: "command" | "modal";
};
export const triggerExecutionMappedToInteraction = async <
  TInteraction extends RouterInteraction,
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
    const result = await execute(interaction);
    if (result) {
      await reply({
        interaction,
        deferReply,
        replyOptions: result,
      });
    }
  } catch (err) {
    let userFacingErrorMsg = `Failed to process ${context} :(`;
    if (err instanceof DoraUserException) {
      userFacingErrorMsg = err.message;
    }
    await reply({
      interaction,
      deferReply,
      replyOptions: { content: userFacingErrorMsg },
    });
    throw err;
  }
};
