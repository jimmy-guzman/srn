import { fuzzyMatch } from "./fuzzy";

describe("fuzzyMatch", () => {
  const scripts = [
    { command: "npm run build", script: "build", workspace: undefined },
    { command: "npm run test", script: "test", workspace: undefined },
    {
      command: "npm run dev",
      script: "dev",
      workspace: "frontend",
      workspacePath: "/apps/frontend",
    },
    {
      command: "npm run build",
      script: "build",
      workspace: "backend",
      workspacePath: "/apps/backend",
    },
  ];

  it("should return exact matches", () => {
    const results = fuzzyMatch("build", scripts);

    expect(results).toHaveLength(2);
    expect(results[0]?.script).toBe("build");
  });

  it("should return partial matches", () => {
    const results = fuzzyMatch("bui", scripts);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.script === "build")).toBe(true);
  });

  it("should search workspace names", () => {
    const results = fuzzyMatch("frontend", scripts);

    expect(results).toHaveLength(1);
    expect(results[0]?.workspace).toBe("frontend");
  });

  it("should return empty array when no matches found", () => {
    const results = fuzzyMatch("nonexistent", scripts);

    expect(results).toHaveLength(0);
  });

  it("should be case insensitive for fallback search", () => {
    const results = fuzzyMatch("TEST", scripts);

    expect(results).toHaveLength(1);
    expect(results[0]?.script).toBe("test");
  });
});
