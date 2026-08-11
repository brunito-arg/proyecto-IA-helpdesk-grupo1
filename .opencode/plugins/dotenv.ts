import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

const projectRoot = join(import.meta.dir, "..", "..")
const envPath = join(projectRoot, ".env")

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[m[1]] = value
  }
  return out
}

const env = parseEnv(readFileSync(envPath, "utf8"))

export const DotenvPlugin: Plugin = async () => {
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }
  return {
    config: async (config) => {
      const github = config.mcp?.github
      if (github?.type === "local" && github.environment) {
        github.environment.GITHUB_PERSONAL_ACCESS_TOKEN =
          env.GITHUB_PERSONAL_ACCESS_TOKEN
      }
      const slack = config.mcp?.slack
      if (slack?.type === "local" && slack.environment) {
        slack.environment.SLACK_MCP_XOXB_TOKEN = env.SLACK_BOT_TOKEN
        slack.environment.SLACK_MCP_ADD_MESSAGE_TOOL = "true"
      }
    },
    "shell.env": async (_input, output) => {
      for (const [key, value] of Object.entries(env)) output.env[key] = value
    },
  }
}
