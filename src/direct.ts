import { join } from "pathe";

import type { PackageInfo } from "./packages";

import { executeScript, executeScriptByName } from "./execute";
import { fuzzyMatch } from "./fuzzy";
import { logger } from "./logger";
import { getPackages } from "./packages";
import { interactiveFindScript } from "./prompts";
import { getAllScripts } from "./scripts";

function parseScriptArgs(positionals: string[], packages: PackageInfo[]) {
  const workspacePackages = packages.filter((p) => !p.isRoot);

  const firstMatchesWorkspace = workspacePackages.some((w) => {
    return (
      w.name === positionals[0] ||
      w.relativeDir === positionals[0] ||
      w.dirName === positionals[0]
    );
  });

  if (firstMatchesWorkspace && positionals.length >= 2) {
    return {
      scriptName: positionals[1],
      workspace: positionals[0],
    };
  }

  return {
    scriptName: positionals[0],
    workspace: undefined,
  };
}

function findWorkspace(workspace: string, packages: PackageInfo[]) {
  return packages.find((w) => {
    return (
      w.name === workspace ||
      w.relativeDir === workspace ||
      w.dirName === workspace
    );
  });
}

async function handleFuzzySearch(
  cwd: string,
  packages: PackageInfo[],
  scriptName: string,
) {
  const allScripts = await getAllScripts(packages);
  const matches = fuzzyMatch(scriptName, allScripts);

  if (matches.length === 0) {
    logger.error(`Script "${scriptName}" not found`);

    process.exit(1);
  }

  const selected = await interactiveFindScript(matches);

  if (!selected) {
    process.exit(0);
  }

  await executeScript(cwd, selected);
}

export async function runDirectMode(cwd: string, positionals: string[]) {
  const packages = await getPackages(cwd);
  const rootPackage = packages.find((p) => p.isRoot);

  if (positionals.length === 0) {
    await handleFuzzySearch(cwd, packages, "");

    return;
  }

  const { scriptName, workspace } = parseScriptArgs(positionals, packages);

  try {
    const pkg = workspace ? findWorkspace(workspace, packages) : rootPackage;

    if (workspace && !pkg) {
      await handleFuzzySearch(cwd, packages, scriptName ?? workspace);

      return;
    }

    const pkgPath = pkg ? join(cwd, pkg.relativeDir) : cwd;

    if (scriptName) {
      await (pkg?.scripts?.[scriptName]
        ? executeScriptByName(
            pkgPath,
            scriptName,
            workspace ? pkg.name : undefined,
          )
        : handleFuzzySearch(cwd, packages, scriptName));
    }
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
