// Law of identity, enforced by a script instead of by memory: flags retired synonyms that the glossary says not to use.
// Usage:
//   node term-check.mjs --text "..."      print violations; exit 1 if any
//   node term-check.mjs --file doc.md     same, for a document before it is sent
//   node term-check.mjs --hook-stop       Stop hook: reads hook JSON on stdin and blocks once if my last answer used a retired word
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Glossaries are per project (one bounded context each); DIALOGUE_GLOSSARY adds a personal one shared across projects.
const GLOSSARIES = [
  process.env.DIALOGUE_GLOSSARY,
  join(process.cwd(), "docs", "glossary.md"),
  join(process.cwd(), "GLOSSARY.md"),
].filter(Boolean);

export function loadGlossary(paths = GLOSSARIES) {
  const entries = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      if (cells.length < 6 || cells[0] === "正式名" || cells[0] === "term" || /^:?-+:?$/.test(cells[0])) continue;
      const retired = cells[4].split(/[、,，;；\s]+/).filter((word) => word && !/^[—-]+$/.test(word));
      if (retired.length) entries.push({ term: cells[0], retired, source: path });
    }
  }
  return entries;
}

// Quoting a retired word in order to talk about it is fine; only plain usage counts.
function stripQuoted(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/「[^」]*」/g, "")
    .replace(/“[^”]*”/g, "")
    .replace(/"[^"\n]*"/g, "");
}

function positions(text, word) {
  const found = [];
  for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + 1)) found.push(i);
  return found;
}

export function findViolations(text, entries = loadGlossary()) {
  const plain = stripQuoted(text);
  // A retired word can sit inside an official name (「群」 inside 「群聊」), and an official name can sit
  // inside a retired word (「对话」 inside 「临时对话」); only a hit not covered by an official name counts.
  const covered = entries.flatMap(({ term }) => positions(plain, term).map((start) => [start, start + term.length]));
  const found = [];
  for (const { term, retired } of entries) {
    for (const word of retired) {
      const free = positions(plain, word).some(
        (start) => !covered.some(([from, to]) => from <= start && start + word.length <= to),
      );
      if (free) found.push({ used: word, term });
    }
  }
  return found;
}

export function describe(violations) {
  return violations.map(({ used, term }) => `「${used}」应写作「${term}」`).join("；");
}

// Text of the assistant turn that just ended: everything said after the last message the human typed.
function lastAssistantText(transcriptPath) {
  const lines = readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const isHumanTurn = (e) =>
    e.type === "user" &&
    (typeof e.message?.content === "string" ||
      (Array.isArray(e.message?.content) && e.message.content.some((b) => b.type === "text")));
  let start = 0;
  lines.forEach((e, i) => {
    if (isHumanTurn(e)) start = i + 1;
  });
  return lines
    .slice(start)
    .filter((e) => e.type === "assistant" && Array.isArray(e.message?.content))
    .flatMap((e) => e.message.content.filter((b) => b.type === "text").map((b) => b.text))
    .join("\n");
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--hook-stop")) {
    try {
      const input = JSON.parse(readFileSync(0, "utf8"));
      // Already blocked once this turn: let it end rather than loop.
      if (input.stop_hook_active) process.exit(0);
      const violations = findViolations(lastAssistantText(input.transcript_path));
      if (violations.length) {
        process.stdout.write(
          JSON.stringify({
            decision: "block",
            reason: `同一律：${describe(violations)}。用一两句话更正这些叫法，再结束。`,
          }),
        );
      }
    } catch {
      // A broken glossary or transcript must never trap the session.
    }
    process.exit(0);
  }
  const text = arg("text") ?? (arg("file") ? readFileSync(arg("file"), "utf8") : "");
  const violations = findViolations(text);
  if (violations.length) {
    process.stdout.write(`同一律：${describe(violations)}\n`);
    process.exit(1);
  }
}
