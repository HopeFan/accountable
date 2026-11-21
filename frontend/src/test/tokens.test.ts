import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isCode =
      /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name);
    return isCode ? [path] : [];
  });
}

const css = readFileSync(join(SRC, "theme/tokens.css"), "utf8");
const names = (block: string) =>
  [...block.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);

describe("colours live in tokens.css", () => {
  it("no component file contains a hex colour", () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("every token the dark block sets also exists in the light block", () => {
    const light = names(css.match(/:root\s*{([^}]*)}/)![1]);
    const dark = names(css.match(/:root\[data-theme="dark"\]\s*{([^}]*)}/)![1]);
    expect(dark.filter((name) => !light.includes(name))).toEqual([]);
  });
});
