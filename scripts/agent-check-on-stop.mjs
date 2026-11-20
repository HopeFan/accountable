// Stop hook: run `npm run check:quick` when the agent finishes a turn. On failure, block the stop
// once and send the output back. stop_hook_active is true on the retry, so the agent can then stop
// and this can never loop forever.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
if (input.stop_hook_active) process.exit(0);

const run = spawnSync("npm run check:quick", {
  cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  shell: true,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (run.status === 0) process.exit(0);

const tail = `${run.stdout}\n${run.stderr}`
  .trim()
  .split("\n")
  .slice(-60)
  .join("\n");
console.log(
  JSON.stringify({
    decision: "block",
    reason: `npm run check:quick failed. Fix these problems:\n${tail}`,
  }),
);
