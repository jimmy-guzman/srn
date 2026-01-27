import { executeScript } from "./execute";
import { logger } from "./logger";
import { getPackages } from "./packages";
import { interactiveFindScript } from "./prompts";
import { getAllScripts } from "./scripts";

export async function runInteractiveMode(cwd: string) {
  const packages = await getPackages(cwd);
  const allScripts = await getAllScripts(packages);

  if (allScripts.length === 0) {
    logger.error("No scripts found in package.json");
    process.exit(1);
  }

  const selected = await interactiveFindScript(allScripts);

  if (!selected) {
    process.exit(0);
  }

  const code = await executeScript(cwd, selected);

  process.exit(code);
}
