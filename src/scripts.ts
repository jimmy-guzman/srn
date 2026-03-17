import type { PackageInfo } from "./packages";

import { sortScriptsByFrequency } from "./history";

export interface ScriptMatch {
  command: string;
  script: string;
  workspace?: string;
  workspacePath?: string;
}

function createScriptMatch(pkg: PackageInfo, scriptName: string) {
  const command = pkg.scripts?.[scriptName];

  if (!command) return null;

  return {
    command,
    script: scriptName,
    workspace: pkg.isRoot ? undefined : pkg.name,
    workspacePath: pkg.isRoot ? undefined : pkg.relativeDir,
  };
}

async function getPackageScripts(pkg: PackageInfo) {
  if (!pkg.scripts) {
    return [];
  }

  const scriptNames = Object.keys(pkg.scripts);
  const sortedNames = await sortScriptsByFrequency(pkg.dir, scriptNames);

  return sortedNames.flatMap((name) => {
    const script = createScriptMatch(pkg, name);

    return script ? [script] : [];
  });
}

export async function getAllScripts(packages: PackageInfo[]) {
  const allScripts: ScriptMatch[] = [];

  for (const pkg of packages) {
    const scripts = await getPackageScripts(pkg);

    allScripts.push(...scripts);
  }

  return allScripts;
}

export async function listScripts(packages: PackageInfo[]) {
  const allScripts = await getAllScripts(packages);

  return allScripts.map((s) => {
    return s.workspace ? `${s.workspace}:${s.script}` : s.script;
  });
}
