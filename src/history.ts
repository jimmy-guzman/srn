import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";

import { join } from "pathe";

interface ScriptRecord {
  count: number;
  lastRun: string;
}

type ProjectHistory = Record<string, ScriptRecord>;
type ScriptHistory = Record<string, ProjectHistory>;

const HISTORY_DIR = join(homedir(), ".srx");
const HISTORY_FILE = join(HISTORY_DIR, "history.json");

export async function recordScript(projectPath: string, scriptName: string) {
  const history = await loadHistory();
  const updatedHistory = updateScriptRecord(history, projectPath, scriptName);

  await saveHistory(updatedHistory);
}

export async function sortScriptsByFrequency(
  projectPath: string,
  scripts: string[],
) {
  const history = await loadHistory();
  const projectHistory = history[projectPath] ?? {};

  return scripts.toSorted((a, b) =>
    compareScriptFrequency(a, b, projectHistory),
  );
}

async function loadHistory() {
  try {
    const data = await readFile(HISTORY_FILE, "utf8");

    return JSON.parse(data) as ScriptHistory;
  } catch {
    return {};
  }
}

async function saveHistory(history: ScriptHistory) {
  try {
    await ensureHistoryDir();
    await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch {
    // Silently ignore write errors
  }
}

async function ensureHistoryDir() {
  await mkdir(HISTORY_DIR, { recursive: true });
}

function updateScriptRecord(
  history: ScriptHistory,
  projectPath: string,
  scriptName: string,
) {
  const updatedHistory = { ...history };

  updatedHistory[projectPath] ??= {};

  const currentRecord = updatedHistory[projectPath][scriptName];

  updatedHistory[projectPath][scriptName] = {
    count: (currentRecord?.count ?? 0) + 1,
    lastRun: new Date().toISOString(),
  };

  return updatedHistory;
}

function compareScriptFrequency(
  a: string,
  b: string,
  projectHistory: ProjectHistory,
) {
  const aCount = projectHistory[a]?.count ?? 0;
  const bCount = projectHistory[b]?.count ?? 0;

  return bCount - aCount;
}
