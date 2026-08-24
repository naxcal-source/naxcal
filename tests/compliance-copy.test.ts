import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const SEARCH_TARGETS = ["src", "public", "docs", "README.md", "CLAUDE.md"];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".json", ".md", ".ts", ".tsx", ".txt"]);
const regulatorInitials = ["F", "C", "A"].join("");
const regulatorName = ["Financial", "Conduct", "Authority"].join(" ");
const protectionPhrase = ["compensation", "scheme"].join(" ");
const PROHIBITED_CLAIMS = [
  { label: "unsupported regulator-initials claim", pattern: new RegExp(`\\b${regulatorInitials}\\b`, "i") },
  { label: "unsupported regulator-name claim", pattern: new RegExp(regulatorName, "i") },
  { label: "unsupported statutory-protection claim", pattern: new RegExp(protectionPhrase, "i") },
];

async function listTextFiles(target: string): Promise<string[]> {
  const absoluteTarget = path.join(ROOT, target);
  const entries = await readdir(absoluteTarget, { withFileTypes: true }).catch(() => []);

  if (entries.length === 0) {
    return TEXT_EXTENSIONS.has(path.extname(absoluteTarget)) ? [absoluteTarget] : [];
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const relativeEntry = path.join(target, entry.name);
      return entry.isDirectory()
        ? listTextFiles(relativeEntry)
        : Promise.resolve(TEXT_EXTENSIONS.has(path.extname(entry.name)) ? [path.join(ROOT, relativeEntry)] : []);
    }),
  );

  return nested.flat();
}

test("customer and operator copy contains no unsupported regulatory claims", async () => {
  const files = (await Promise.all(SEARCH_TARGETS.map(listTextFiles))).flat();
  const violations: string[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const claim of PROHIBITED_CLAIMS) {
      if (claim.pattern.test(content)) {
        violations.push(`${path.relative(ROOT, file)}: ${claim.label}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
