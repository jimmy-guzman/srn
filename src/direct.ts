import { join } from "pathe";

import type { PackageInfo } from "./packages";

import { executeScript, executeScriptByName } from "./execute";
import { fuzzyMatch } from "./fuzzy";
import { logger } from "./logger";
import { getPackagesInfo } from "./packages";
import { interactiveFindScript } from "./prompts";
import { getAllScripts } from "./scripts";

interface WorkspaceInfo {
  name: string;
  relativeDir: string;
}

function parseScriptArgs(positionals: string[], workspaces: WorkspaceInfo[]) {
  const firstMatchesWorkspace = workspaces.some((w) => {
    return (
      w.name === positionals[0] ||
      w.relativeDir === positionals[0] ||
      w.relativeDir.split("/").pop() === positionals[0]
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

function findWorkspace(workspace: string, workspaces: PackageInfo[]) {
  return workspaces.find((w) => {
    return (
      w.name === workspace ||
      w.relativeDir === workspace ||
      w.relativeDir.split("/").pop() === workspace
    );
  });
}

async function handleFuzzySearch(cwd: string, scriptName: string) {
  const allScripts = await getAllScripts(cwd);
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
  const { rootPackage, workspaces } = await getPackagesInfo(cwd);

  if (positionals.length === 0) {
    await handleFuzzySearch(cwd, "");

    return;
  }

  const { scriptName, workspace } = parseScriptArgs(positionals, workspaces);

  try {
    const pkg = workspace ? findWorkspace(workspace, workspaces) : rootPackage;

    if (workspace && !pkg) {
      await handleFuzzySearch(cwd, scriptName ?? workspace);

      return;
    }

    const pkgPath = pkg ? join(cwd, pkg.relativeDir) : cwd;

    if (scriptName) {
      await (pkg?.packageJson.scripts?.[scriptName]
        ? executeScriptByName(
            pkgPath,
            scriptName,
            workspace ? pkg.name : undefined,
          )
        : handleFuzzySearch(cwd, scriptName));
    }
  } catch (error) {
    logger.error(error);

    process.exit(1);
  }
}
