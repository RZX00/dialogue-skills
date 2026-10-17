// SessionStart hook for plugin installs: a plugin cannot ship an always-on rule file,
// so the core rule is injected as session context instead. Script installs use ~/.claude/rules/dialogue.md
// and should not also enable this hook, or the rule would load twice.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const core = join(dirname(fileURLToPath(import.meta.url)), "..", "core");
try {
  const text = ["core.md", "chinese.md"].map((f) => readFileSync(join(core, f), "utf8").trim()).join("\n\n");
  process.stdout.write(text + "\n");
} catch {
  // A missing file must never block the session from starting.
}
