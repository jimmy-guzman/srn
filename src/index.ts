#!/usr/bin/env node
import { parseArgs } from "node:util";

import { readPackageJSON } from "pkg-types";

import { runDirectMode } from "./direct";
import { runInteractiveMode } from "./interactive";
import { logger } from "./logger";

function showHelp() {
  logger.log(`
srx - Smart package.json script runner

Usage:
  srx                       Interactive mode - fuzzy find and select script
  srx <script>              Run a script from package.json
  srx [workspace] <script>  Run a script in a specific workspace

Options:
  -h, --help               Show this help message
  -v, --version            Show version number
`);
}

async function showVersion() {
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

if (positionals.length === 0) {
  await runInteractiveMode(cwd);

  process.exit(0);
}

await runDirectMode(cwd, positionals);
