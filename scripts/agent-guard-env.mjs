// PreToolUse hook: stop the agent reading or editing .env, directly or through a shell command.
// .env.example is allowed. Exit code 2 blocks the tool call and shows the message to the agent.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const args = input.tool_input ?? {};

// A ".env" or ".env.<suffix>" that is not part of a longer name, and is not ".env.example".
const ENV_NAME = /(^|[^\w.-])\.env(\.[\w-]+)?(?![\w-])/g;

function namesEnv(text) {
  if (typeof text !== "string") return false;
  return [...text.matchAll(ENV_NAME)].some((m) => m[2] !== ".example");
}

const targets = [args.file_path, args.notebook_path, args.path, args.command];
if (targets.some(namesEnv)) {
  console.error(
    "Blocked: .env holds the person's secrets. Do not read, edit or mention it in commands; ask the person to change it. .env.example is fine.",
  );
  process.exit(2);
}
