import * as dotenv from "dotenv"
import path from "path"
import { defineConfig } from "vitest/config"

dotenv.config({ path: path.resolve(__dirname, ".env.test") })

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
})
