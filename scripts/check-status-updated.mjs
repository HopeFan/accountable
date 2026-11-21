// Pre-commit check: a commit that changes anything outside docs/ must also update docs/STATUS.md.
// Commits that only touch docs are fine.
import { execFileSync } from "node:child_process";

const staged = execFileSync("git", ["diff", "--name-only", "--cached"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const changesWork = staged.some((file) => !file.startsWith("docs/"));
if (changesWork && !staged.includes("docs/STATUS.md")) {
  console.error(
    "docs/STATUS.md is not part of this commit. Update it to say what is now done or still to do, then stage it.",
  );
  process.exit(1);
}
