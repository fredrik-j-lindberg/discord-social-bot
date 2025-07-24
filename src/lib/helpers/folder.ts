import fs from "node:fs"

import path from "path"

import { DoraException } from "../exceptions/DoraException"

/**
 * This will grab the default exports for all modules in specified folder
 * Useful to dynamically import modules that have a default export with a specific structure
 */
export const importFolderModules = async <
  TDefaultExport extends { data: { name: string } },
>(
  folderPath: string,
): Promise<{ [name: string]: TDefaultExport }> => {
  try {
    const filesToImport = fs.readdirSync(folderPath)

    const modulesByName: Record<string, TDefaultExport> = {}
    for (const file of filesToImport) {
      const filePath = path.join(folderPath, file)
      try {
        const { default: defaultExport } = (await import(filePath)) as {
          default: TDefaultExport
        }
        modulesByName[defaultExport.data.name] = defaultExport
      } catch (err) {
        throw new DoraException(
          "Failed to import module dynamically",
          DoraException.Type.Unknown,
          { cause: err, metadata: { filePath } },
        )
      }
    }
    return modulesByName
  } catch (err) {
    if (err instanceof DoraException) throw err
    throw new DoraException(
      "Failed to import folder modules dynamically",
      DoraException.Type.Unknown,
      { cause: err, metadata: { folderPath } },
    )
  }
}
