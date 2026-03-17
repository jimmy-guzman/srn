#!/usr/bin/env node
import { parseArgs } from "node:util";

import { runDirectMode } from "./direct";
import { runInteractiveMode } from "./interactive";
import { logger } from "./logger";
import { getPackages } from "./packages";
import { listScripts } from "./scripts";

function showHelp() {
  logger.log(`
srn - Smart package.json script runner

Usage:
  srn                       Interactive mode - fuzzy find and select script
  srn <script>              Run a script from package.json
  srn [workspace] <script>  Run a script in a specific workspace
  srn list                  List all available scripts
  srn ls                    List all available scripts (alias)

Options:
  -h, --help               Show this help message
  -v, --version            Show version number
`);
}

async function showVersion() {
  const { readPackageJSON } = await import("pkg-types");

  const pkg = await readPackageJSON(import.meta.url);

  logger.log(pkg.version);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  args: process.argv.slice(2),
  options: {
    help: { short: "h", type: "boolean" },
    version: { short: "v", type: "boolean" },
  },
  strict: false,
});

if (values.help) {
  showHelp();

  process.exit(0);
}

if (values.version) {
  await showVersion();

  process.exit(0);
}

const cwd = process.cwd();

if (positionals[0] === "list" || positionals[0] === "ls") {
  const packages = await getPackages(cwd);
  const scripts = await listScripts(packages);

  for (const script of scripts) {
    logger.log(script);
  }

  process.exit(0);
}

if (positionals.length === 0) {
  await runInteractiveMode(cwd);

  process.exit(0);
}

await runDirectMode(cwd, positionals);
