import uFuzzy from "@leeoniya/ufuzzy";

import type { ScriptMatch } from "./scripts";

const fuzzySearcher = new uFuzzy();

function fallbackSearch(
  query: string,
  haystack: string[],
  scripts: ScriptMatch[],
) {
  const lowerQuery = query.toLowerCase();

  return haystack.reduce<ScriptMatch[]>((matches, item, idx) => {
    const script = scripts[idx];

    if (item.toLowerCase().includes(lowerQuery) && script) {
      matches.push(script);
    }

    return matches;
  }, []);
}

function mapFuzzyResults(
  order: number[],
  indexes: number[],
  scripts: ScriptMatch[],
) {
  return order.reduce<ScriptMatch[]>((results, index) => {
    const scriptIndex = indexes[index];
    const script = scriptIndex === undefined ? undefined : scripts[scriptIndex];

    if (script) {
      results.push(script);
    }

    return results;
  }, []);
}

export function fuzzyMatch(query: string, scripts: ScriptMatch[]) {
  const haystack = scripts.map((s) => `${s.script}|${s.workspace}`);
  const [indexes, info, order] = fuzzySearcher.search(haystack, query);

  if (!indexes || !info || indexes.length === 0) {
    return fallbackSearch(query, haystack, scripts);
  }

  return mapFuzzyResults(order, indexes, scripts);
}
