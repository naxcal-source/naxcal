// Sends an HTML campaign to a CSV list of contacts, reusing the same
// suppression check, personalization, and batching as the admin UI.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/email-campaign.ts <contacts.csv> <body.html> "<subject>"
//
// contacts.csv: one per line, either `email` or `Name,email@example.com`.
// A run through this script is just as irreversible as the admin UI — it
// sends real email. Double-check the CSV and HTML before running.

import { readFileSync } from "fs";
import { runEmailCampaign, dedupeContacts, CampaignContact } from "../src/lib/email-campaign";

function parseContactsCsv(raw: string): CampaignContact[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, second] = line.split(",").map((s) => s.trim());
      const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);
      return second && isEmail(second) ? { email: second, name: first } : { email: first };
    })
    .filter((c) => /\S+@\S+\.\S+/.test(c.email));
}

async function main() {
  const [csvPath, htmlPath, subject] = process.argv.slice(2);
  if (!csvPath || !htmlPath || !subject) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/email-campaign.ts <contacts.csv> <body.html> \"<subject>\"");
    process.exit(1);
  }

  const contacts = dedupeContacts(parseContactsCsv(readFileSync(csvPath, "utf-8")));
  const html = readFileSync(htmlPath, "utf-8");

  console.log(`Sending "${subject}" to ${contacts.length} unique contacts from ${csvPath}...`);
  const result = await runEmailCampaign(subject, html, contacts);

  console.log(`Done. total=${result.total} sent=${result.sent} skipped(unsubscribed)=${result.skipped} failed=${result.failed}`);
  if (result.failedEmails.length > 0) {
    console.log("Failed:", result.failedEmails.join(", "));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
