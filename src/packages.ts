import type { PackageJson } from "pkg-types";

import { existsSync, readFileSync } from "node:fs";

import { join, relative, resolve } from "pathe";

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

const pnpmWorkspaceCache = new Map<string, null | string[]>();

async function readPnpmWorkspaceYaml(dir: string) {
  const yamlPath = join(dir, "pnpm-workspace.yaml");

  if (pnpmWorkspaceCache.has(yamlPath)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- has guarantees existence
    return pnpmWorkspaceCache.get(yamlPath)!;
  }

  if (!existsSync(yamlPath)) {
    pnpmWorkspaceCache.set(yamlPath, null);

    return null;
  }

  try {
    const { parse: parseYaml } = await import("yaml");
    const content = readFileSync(yamlPath, "utf8");
    const parsed = parseYaml(content) as { packages?: string[] };
    const packages = parsed.packages ?? [];

    pnpmWorkspaceCache.set(yamlPath, packages);

    return packages;
  } catch {
    pnpmWorkspaceCache.set(yamlPath, null);

    return null;
  }
}

async function findWorkspaceRoot(cwd: string) {
  const { readPackageJSON } = await import("pkg-types");

  let dir = resolve(cwd);
  let parent = resolve(dir, "..");

  if (parent === dir) return null;

  while (parent !== dir) {
    const pkgPath = join(dir, "package.json");

    if (existsSync(pkgPath)) {
      try {
        const pkg = await readPackageJSON(pkgPath);
        const workspaces = pkg.workspaces as WorkspaceConfig;
        const pnpm = pkg.pnpm as PnpmConfig;
        const pnpmYaml = await readPnpmWorkspaceYaml(dir);

        if (pnpmYaml) return dir;

        if (workspaces || pnpm?.workspaces) return dir;
      } catch {
        // Continue searching
      }
    }

    dir = parent;
    parent = resolve(dir, "..");
  }

  return null;
}

function isWorkspaceObject(
  config: WorkspaceConfig,
): config is { packages?: string[] } {
  return typeof config === "object" && !Array.isArray(config);
}

async function getWorkspacePatterns(rootDir: string, rootPkg: PackageJson) {
  const pnpmYaml = await readPnpmWorkspaceYaml(rootDir);

  if (pnpmYaml) return pnpmYaml;

  if (Array.isArray(rootPkg.workspaces)) return rootPkg.workspaces;

  const workspaces = rootPkg.workspaces as WorkspaceConfig;
  const pnpm = rootPkg.pnpm as PnpmConfig;

  return (
    (isWorkspaceObject(workspaces) ? workspaces.packages : undefined) ??
    pnpm?.workspaces ??
    []
  );
}

async function getWorkspacePackages(rootDir: string, rootPkg: PackageJson) {
  const { readPackageJSON } = await import("pkg-types");
  const picomatch = await import("picomatch");
  const { fdir } = await import("fdir");
  const patterns = await getWorkspacePatterns(rootDir, rootPkg);

  if (patterns.length === 0) return [];

  const pkgJsonPaths = await new fdir()
    .withBasePath()
    .exclude((dirName) => dirName === "node_modules")
    .filter((path) => path.endsWith("package.json"))
    .crawl(rootDir)
    .withPromise();

  const rootPkgPath = join(rootDir, "package.json");
  const matcher = picomatch.default(patterns);
  const packages: PackageInfo[] = [];

  for (const pkgPath of pkgJsonPaths) {
    if (pkgPath === rootPkgPath) continue;

    const dir = pkgPath.slice(0, -13);
    const relPath = relative(rootDir, dir);

    if (!matcher(relPath)) continue;

    const lastSlash = relPath.lastIndexOf("/");
    const dirName = lastSlash === -1 ? relPath : relPath.slice(lastSlash + 1);

    try {
      const packageJson = await readPackageJSON(dir);

      packages.push({
        dir,
        dirName,
        isRoot: false,
        name: packageJson.name ?? dirName,
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
    const { readPackageJSON } = await import("pkg-types");
    const rootDir = await findWorkspaceRoot(cwd);

    if (!rootDir) {
      const packageJson = await readPackageJSON(cwd);

      return [
        {
          dir: cwd,
          dirName: ".",
          isRoot: true,
          name: packageJson.name ?? ".",
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
