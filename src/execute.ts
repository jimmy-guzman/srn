import { existsSync } from "node:fs";

import { join, resolve } from "pathe";
import { x } from "tinyexec";

import type { ScriptMatch } from "./scripts";

import { recordScript } from "./history";

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

function getWorkspaceArgs(
  pm: PackageManager,
  workspace: string,
  script: string,
) {
  const configs = {
    bun: ["--filter", workspace, "run", script],
    npm: ["run", script, "--workspace", workspace],
    pnpm: ["--filter", workspace, "run", script],
    yarn: ["workspace", workspace, "run", script],
  };

  return configs[pm];
}

const cachedPackageManager = new Map<string, PackageManager>();

function detectPackageManager(cwd?: string): PackageManager {
  const rootDir = resolve(cwd ?? process.cwd());

  const cached = cachedPackageManager.get(rootDir);

  if (cached) {
    return cached;
  }

  const lockFiles = [
    { file: "pnpm-lock.yaml", manager: "pnpm" },
    { file: "yarn.lock", manager: "yarn" },
    { file: "bun.lockb", manager: "bun" },
    { file: "bun.lock", manager: "bun" },
  ] as const;

  for (const { file, manager } of lockFiles) {
    if (existsSync(join(rootDir, file))) {
      cachedPackageManager.set(rootDir, manager);

      return manager;
    }
  }

  cachedPackageManager.set(rootDir, "npm");

  return "npm";
}

export async function executeScriptByName(
  pkgPath: string,
  scriptName: string,
  workspace?: string,
  cwd?: string,
) {
  const pm = detectPackageManager(cwd ?? pkgPath);
  const pmArgs = workspace
    ? getWorkspaceArgs(pm, workspace, scriptName)
    : ["run", scriptName];

  await x(pm, pmArgs, { nodeOptions: { stdio: "inherit" } });
  await recordScript(resolve(pkgPath), scriptName);
}

export async function executeScript(cwd: string, selected: ScriptMatch) {
  const pkgPath = selected.workspacePath
    ? resolve(cwd, selected.workspacePath)
    : resolve(cwd);

  const pm = detectPackageManager(cwd);
  const pmArgs = selected.workspace
    ? getWorkspaceArgs(pm, selected.workspace, selected.script)
    : ["run", selected.script];

  const result = await x(pm, pmArgs, { nodeOptions: { stdio: "inherit" } });

  if (result.exitCode === 0) {
    await recordScript(pkgPath, selected.script);
  }

  return result.exitCode;
}
