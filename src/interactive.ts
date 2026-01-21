import { executeScript } from "./execute";
import { logger } from "./logger";
import { interactiveFindScript } from "./prompts";
import { getAllScripts } from "./scripts";

export async function runInteractiveMode(cwd: string) {
  const allScripts = await getAllScripts(cwd);

  if (allScripts.length === 0) {
    logger.error("No scripts found in package.json");
    process.exit(1);
  }

  const selected = await interactiveFindScript(allScripts);

  if (!selected) {
    process.exit(0);
  }

  await executeScript(cwd, selected);
}
