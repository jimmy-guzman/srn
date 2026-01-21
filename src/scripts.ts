import type { PackageInfo } from "./packages";

import { sortScriptsByFrequency } from "./history";
import { getPackagesInfo } from "./packages";

export interface ScriptMatch {
  command: string;
  script: string;
  workspace?: string;
  workspacePath?: string;
}

function createScriptMatch(pkg: PackageInfo, scriptName: string) {
  const command = pkg.packageJson.scripts?.[scriptName];

  if (!command) return null;

  const isRoot = pkg.relativeDir === ".";

  return {
    command,
    script: scriptName,
    workspace: isRoot ? undefined : pkg.name,
    workspacePath: isRoot ? undefined : pkg.relativeDir,
  };
}

async function getPackageScripts(pkg: PackageInfo) {
  if (!pkg.packageJson.scripts) {
    return [];
  }

  const scriptNames = Object.keys(pkg.packageJson.scripts);
  const sortedNames = await sortScriptsByFrequency(pkg.dir, scriptNames);

  return sortedNames.flatMap((name) => {
    const script = createScriptMatch(pkg, name);

    return script ? [script] : [];
  });
}

export async function getAllScripts(cwd: string) {
  const packagesInfo = await getPackagesInfo(cwd);
  const allScripts: ScriptMatch[] = [];

  for (const pkg of packagesInfo.packages) {
    const scripts = await getPackageScripts(pkg);

    allScripts.push(...scripts);
  }

  return allScripts;
}
