import fs from "node:fs"

import path from "path"

import { DoraException } from "../exceptions/DoraException"

function assertIsValidExportedModule<
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  TDefaultExport extends { data: { name: string } },
>(
  exportedModule: unknown,
  filePath: string,
): asserts exportedModule is { default: TDefaultExport } {
  if (!exportedModule || typeof exportedModule !== "object") {
    throw new DoraException(
      "Module was not properly exported",
      DoraException.Type.Unknown,
      { metadata: { filePath } },
    )
  }

  const defaultExport =
    "default" in exportedModule ? exportedModule.default : undefined
  if (!defaultExport || typeof defaultExport !== "object") {
    throw new DoraException(
      "Module does not have a default (object) export",
      DoraException.Type.Unknown,
      { metadata: { filePath } },
    )
  }

  const data = "data" in defaultExport ? defaultExport.data : undefined
  if (!data || typeof data !== "object" || !("name" in data)) {
    throw new DoraException(
      "Module default export does not have a properly configured data property",
      DoraException.Type.TypeError,
      { metadata: { filePath } },
    )
  }
}

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
        const importedModule = (await import(filePath)) as unknown
        assertIsValidExportedModule<TDefaultExport>(importedModule, filePath)

        modulesByName[importedModule.default.data.name] = importedModule.default
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
