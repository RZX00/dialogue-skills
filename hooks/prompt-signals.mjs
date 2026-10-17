// UserPromptSubmit hook: adds a line of context only when the user's own words carry a signal the rules care about.
// No standing per-turn reminder: the core rule is already loaded, and repeated harness text appended to every
// prompt can make newer models treat real user messages as injected instructions.
// Output is phrased as facts about the message, not as commands.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let prompt = "";
try {
  prompt = JSON.parse(readFileSync(0, "utf8")).prompt ?? "";
} catch {}

// Background task notifications also fire UserPromptSubmit; they are not the user talking.
if (/^\s*<(task-notification|system-reminder|local-command)/.test(prompt)) process.exit(0);

// Pasted material is someone else's text; only the user's own words count.
const own = prompt.replace(/<pasted_content[\s\S]*?<\/pasted_content[^>]*>/g, "");
const notes = [];

if (/比如|例如|譬如|举个例子|举例|for example|e\.g\./i.test(own)) {
  notes.push("这条消息里有举例；例子说明的是一类东西，不是范围。");
}

const here = dirname(fileURLToPath(import.meta.url));
const termCheck = [
  join(here, "..", "skills", "dialogue-naming", "scripts", "term-check.mjs"),
  join(homedir(), ".claude", "skills", "dialogue-naming", "scripts", "term-check.mjs"),
  join(homedir(), ".agents", "skills", "dialogue-naming", "scripts", "term-check.mjs"),
].find((path) => existsSync(path));
if (termCheck) {
  try {
    const { findViolations } = await import(pathToFileURL(termCheck).href);
    const hits = findViolations(own);
    if (hits.length) {
      const list = hits.map(({ used, term }) => `「${used}」（术语表正式名「${term}」）`).join("、");
      notes.push(`这条消息用了术语表里已不再用的叫法：${list}。`);
    }
  } catch {
    // A broken glossary must never block the user's message.
  }
}

if (notes.length) process.stdout.write(notes.join("") + "\n");
