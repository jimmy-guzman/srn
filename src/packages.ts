import type { PackageJson } from "pkg-types";

import { existsSync, readFileSync } from "node:fs";

import { fdir } from "fdir";
import { join, relative, resolve } from "pathe";
import picomatch from "picomatch";
import { readPackageJSON } from "pkg-types";
import { parse as parseYaml } from "yaml";

type PnpmConfig = undefined | { workspaces?: string[] };
type WorkspaceConfig = string[] | undefined | { packages?: string[] };

export interface PackageInfo {
  dir: string;
  dirName: string;
  isRoot: boolean;
  name: string;
  relativeDir: string;
  scripts?: PackageJson["scripts"];
}

function readPnpmWorkspaceYaml(dir: string) {
  const yamlPath = join(dir, "pnpm-workspace.yaml");

  if (!existsSync(yamlPath)) {
    return null;
  }

  try {
    const content = readFileSync(yamlPath, "utf8");
    const parsed = parseYaml(content) as { packages?: string[] };

    return parsed.packages ?? [];
  } catch {
    return null;
  }
}

async function findWorkspaceRoot(cwd: string) {
  let dir = resolve(cwd);

  const root = resolve("/");

  while (dir !== root) {
    const pkgPath = join(dir, "package.json");

    if (existsSync(pkgPath)) {
      try {
        const pkg = await readPackageJSON(pkgPath);

        const workspaces = pkg.workspaces as WorkspaceConfig;
        const pnpm = pkg.pnpm as PnpmConfig;
        const pnpmYaml = readPnpmWorkspaceYaml(dir);

        if (workspaces || pnpm?.workspaces || pnpmYaml) {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }

    dir = resolve(dir, "..");
  }

  return null;
}

function isWorkspaceObject(
  config: WorkspaceConfig,
): config is { packages?: string[] } {
  return typeof config === "object" && !Array.isArray(config);
}

function getWorkspacePatterns(rootDir: string, rootPkg: PackageJson) {
  const pnpmYaml = readPnpmWorkspaceYaml(rootDir);

  if (pnpmYaml) {
    return pnpmYaml;
  }

  if (Array.isArray(rootPkg.workspaces)) {
    return rootPkg.workspaces;
  }

  const workspaces = rootPkg.workspaces as WorkspaceConfig;
  const pnpm = rootPkg.pnpm as PnpmConfig;

  return (
    (isWorkspaceObject(workspaces) ? workspaces.packages : undefined) ??
    pnpm?.workspaces ??
    []
  );
}

async function getWorkspacePackages(rootDir: string, rootPkg: PackageJson) {
  const patterns = getWorkspacePatterns(rootDir, rootPkg);

  if (patterns.length === 0) {
    return [];
  }

  const pkgJsonPaths = await new fdir()
    .withBasePath()
    .exclude((dirName) => dirName === "node_modules")
    .filter((path) => path.endsWith("package.json"))
    .crawl(rootDir)
    .withPromise();
  const rootPkgPath = join(rootDir, "package.json");

  const matcher = picomatch(patterns);

  const packages: PackageInfo[] = [];

  for (const pkgPath of pkgJsonPaths) {
    if (pkgPath === rootPkgPath) {
      continue;
    }

    const dir = pkgPath.slice(0, -13);
    const relPath = relative(rootDir, dir);
    const dirName = relPath.split("/").pop() ?? relPath;

    if (!matcher(relPath)) {
      continue;
    }

    try {
      const packageJson = await readPackageJSON(dir);
      const name = packageJson.name ?? dirName;

      packages.push({
        dir,
        dirName,
        isRoot: false,
        name,
        relativeDir: relPath,
        scripts: packageJson.scripts,
      });
    } catch {
      // Skip invalid packages
    }
  }

  return packages;
}

export async function getPackages(cwd: string) {
  try {
    const rootDir = await findWorkspaceRoot(cwd);

    if (!rootDir) {
      const packageJson = await readPackageJSON(cwd);
      const name = packageJson.name ?? ".";

      return [
        {
          dir: cwd,
          dirName: ".",
          isRoot: true,
          name,
          relativeDir: ".",
          scripts: packageJson.scripts,
        },
      ];
    }

    const rootPkg = await readPackageJSON(rootDir);
    const rootPackage: PackageInfo = {
      dir: rootDir,
      dirName: ".",
      isRoot: true,
      name: rootPkg.name ?? ".",
      relativeDir: ".",
      scripts: rootPkg.scripts,
    };

    const workspacePackages = await getWorkspacePackages(rootDir, rootPkg);

    return [rootPackage, ...workspacePackages];
  } catch {
    return [];
  }
}
