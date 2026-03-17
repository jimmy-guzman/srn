import { mkdir, readFile, writeFile } from "node:fs/promises";

import { recordScript, sortScriptsByFrequency } from "./history";

vi.mock("node:fs/promises");
vi.mock("node:os", () => ({
  homedir: () => "/mock/home",
}));

describe("history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sortScriptsByFrequency", () => {
    it("should return scripts sorted by frequency", async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          "/project": {
            build: { count: 5, lastRun: "2024-01-01" },
            dev: { count: 3, lastRun: "2024-01-03" },
            test: { count: 10, lastRun: "2024-01-02" },
          },
        }),
      );

      const result = await sortScriptsByFrequency("/project", [
        "build",
        "test",
        "dev",
      ]);

      expect(result[0]).toBe("test");
      expect(result[1]).toBe("build");
      expect(result[2]).toBe("dev");
    });

    it("should handle scripts with no history", async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          "/project": {
            build: { count: 5, lastRun: "2024-01-01" },
          },
        }),
      );

      const result = await sortScriptsByFrequency("/project", [
        "build",
        "test",
        "dev",
      ]);

      expect(result[0]).toBe("build");
    });

    it("should handle missing history file", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

      const result = await sortScriptsByFrequency("/project", [
        "build",
        "test",
      ]);

      expect(result).toHaveLength(2);
    });

    it("should handle invalid JSON", async () => {
      vi.mocked(readFile).mockResolvedValue("invalid json");

      const result = await sortScriptsByFrequency("/project", [
        "build",
        "test",
      ]);

      expect(result).toHaveLength(2);
    });

    it("should use lastRun as tiebreaker when counts are equal", async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          "/project": {
            build: { count: 3, lastRun: "2024-01-01T00:00:00.000Z" },
            dev: { count: 3, lastRun: "2024-01-03T00:00:00.000Z" },
            test: { count: 3, lastRun: "2024-01-02T00:00:00.000Z" },
          },
        }),
      );

      const result = await sortScriptsByFrequency("/project", [
        "build",
        "test",
        "dev",
      ]);

      expect(result[0]).toBe("dev");
      expect(result[1]).toBe("test");
      expect(result[2]).toBe("build");
    });
  });

  describe("recordScript", () => {
    it("should record a new script", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await recordScript("/project", "build");

      expect(mkdir).toHaveBeenCalledWith("/mock/home/.srn", {
        recursive: true,
      });
      expect(writeFile).toHaveBeenCalledWith(
        "/mock/home/.srn/history.json",
        expect.stringContaining('"build"'),
      );
    });

    it("should increment count for existing script", async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          "/project": {
            build: { count: 5, lastRun: "2024-01-01" },
          },
        }),
      );
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await recordScript("/project", "build");

      const writeCall = vi.mocked(writeFile).mock.calls[0];
      const written: Record<
        string,
        Record<string, { count: number; lastRun: string }>
      > = JSON.parse(writeCall?.[1] as string);

      expect(written["/project"]?.build?.count).toBe(6);
    });

    it("should handle write errors silently", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));
      vi.mocked(writeFile).mockRejectedValue(new Error("Write failed"));

      await expect(recordScript("/project", "build")).resolves.toBeUndefined();
    });
  });
});
