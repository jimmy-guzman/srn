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

async function detectPackageManager(cwd?: string) {
  const { access } = await import("node:fs/promises");
  const rootDir = cwd ?? process.cwd();

  const lockFiles = [
    { file: "pnpm-lock.yaml", manager: "pnpm" },
    { file: "yarn.lock", manager: "yarn" },
    { file: "bun.lockb", manager: "bun" },
    { file: "bun.lock", manager: "bun" },
  ] as const;

  for (const { file, manager } of lockFiles) {
    try {
      await access(join(rootDir, file));

      return manager;
    } catch {
      continue;
    }
  }

  return "npm" as const;
}

export async function executeScriptByName(
  pkgPath: string,
  scriptName: string,
  workspace?: string,
) {
  const pm = await detectPackageManager();
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

  const pm = await detectPackageManager();
  const pmArgs = selected.workspace
    ? getWorkspaceArgs(pm, selected.workspace, selected.script)
    : ["run", selected.script];

  const result = await x(pm, pmArgs, { nodeOptions: { stdio: "inherit" } });

  if (result.exitCode === 0) {
    await recordScript(pkgPath, selected.script);
  }

  return result.exitCode;
}
