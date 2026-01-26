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
  name: string;
  packageJson: PackageJson;
  relativeDir: string;
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

        // Check for workspace configuration
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
  // Check pnpm-workspace.yaml first (takes precedence)
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

  // Find all package.json files
  const pkgJsonPaths = await new fdir()
    .withBasePath()
    .exclude((dirName) => dirName === "node_modules")
    .filter((path) => path.endsWith("package.json"))
    .crawl(rootDir)
    .withPromise();

  const rootPkgPath = join(rootDir, "package.json");
  const packages: PackageInfo[] = [];

  for (const pkgPath of pkgJsonPaths) {
    if (pkgPath === rootPkgPath) {
      continue;
    }

    const dir = pkgPath.slice(0, -13); // Remove '/package.json' (13 chars)
    const relPath = relative(rootDir, dir);

    if (
      !patterns.some((pattern) => {
        const matcher = picomatch(pattern);

        return matcher(relPath);
      })
    ) {
      continue;
    }

    try {
      const packageJson = await readPackageJSON(dir);

      if (packageJson.name) {
        packages.push({
          dir,
          name: packageJson.name,
          packageJson,
          relativeDir: relPath,
        });
      }
    } catch {
      // Skip invalid packages
    }
  }

  return packages;
}

export async function getPackagesInfo(cwd: string) {
  try {
    const rootDir = await findWorkspaceRoot(cwd);

    if (!rootDir) {
      // Single package (no workspace)
      const packageJson = await readPackageJSON(cwd);
      const rootPackage = {
        dir: cwd,
        name: packageJson.name ?? "unknown",
        packageJson,
        relativeDir: ".",
      };

      return {
        packages: [rootPackage],
        rootPackage,
        workspaces: [],
      };
    }

    const rootPkg = await readPackageJSON(rootDir);
    const rootPackage = {
      dir: rootDir,
      name: rootPkg.name ?? "unknown",
      packageJson: rootPkg,
      relativeDir: ".",
    };

    const workspacePackages = await getWorkspacePackages(rootDir, rootPkg);
    const packages = [rootPackage, ...workspacePackages];

    return {
      packages,
      rootPackage,
      workspaces: workspacePackages,
    };
  } catch {
    return {
      packages: [],
      workspaces: [],
    };
  }
}
