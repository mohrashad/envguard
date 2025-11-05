import * as fs from "fs";
import * as path from "path";

export function parseDotenvFile(
  envObject: Record<string, string | undefined>,
  envPath: string = path.resolve(process.cwd(), ".env")
): Record<string, string> {
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ .env file not found at: ${envPath}`);
    return {};
  }

  const fileContent = fs.readFileSync(envPath, "utf8");
  const envKeysFromFile: Set<string> = new Set();

  // Extract keys from .env file
  for (const line of fileContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key] = trimmed.split("=");
    if (key) envKeysFromFile.add(key.trim());
  }

  // Filter only keys that exist in .env file
  const filteredEnv: Record<string, string> = {};
  for (const key of envKeysFromFile) {
    const value = envObject[key];
    if (value !== undefined) filteredEnv[key] = value;
  }

  return filteredEnv;
}
