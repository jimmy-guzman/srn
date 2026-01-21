import { defineConfig } from "tsdown";

export default defineConfig({
  inlineOnly: [
    "@leeoniya/ufuzzy",
    "picocolors",
    "sisteransi",
    "@clack/core",
    "@clack/prompts",
  ],
  minify: true,
  publint: true,
});
