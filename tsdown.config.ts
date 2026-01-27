import { defineConfig } from "tsdown";

export default defineConfig({
  inlineOnly: [
    "@leeoniya/ufuzzy",
    "sisteransi",
    "@clack/core",
    "@clack/prompts",
    "confbox",
    "exsolve",
    "pkg-types",
  ],
  minify: true,
  publint: true,
});
