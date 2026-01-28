import type { ScriptMatch } from "./scripts";

const COMMAND_TRUNCATE_LENGTH = 50;
const COMMAND_PREVIEW_LENGTH = 47;

function truncateCommand(command: string) {
  if (command.length <= COMMAND_TRUNCATE_LENGTH) {
    return command;
  }

  return `${command.slice(0, COMMAND_PREVIEW_LENGTH)}...`;
}

function formatScriptLabel(match: ScriptMatch) {
  return match.workspace
    ? `${match.workspace} → ${match.script}`
    : match.script;
}

function createScriptOption(match: ScriptMatch) {
  return {
    hint: truncateCommand(match.command),
    label: formatScriptLabel(match),
    value: match,
  };
}

export async function interactiveFindScript(allScripts: ScriptMatch[]) {
  const { autocomplete, isCancel } = await import("@clack/prompts");

  const options = allScripts.map(createScriptOption);
  const result = await autocomplete({
    message: "Select a script to run:",
    options,
  });

  return isCancel(result) ? null : result;
}
