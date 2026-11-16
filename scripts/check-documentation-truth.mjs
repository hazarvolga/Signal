import { readFile } from "node:fs/promises";

const files = {
  readme: await readFile(new URL("../README.md", import.meta.url), "utf8"),
  capability: await readFile(new URL("../docs/CAPABILITY_STATUS.md", import.meta.url), "utf8"),
  preference: await readFile(new URL("../src/pages/PreferenceCenter.tsx", import.meta.url), "utf8"),
  reports: await readFile(new URL("../src/pages/Reports.tsx", import.meta.url), "utf8"),
};

const forbidden = [
  ["README production-grade claim", files.readme, /production-grade/i],
  ["README SQLite setup", files.readme, /Better-SQLite3|file:\.\/dev\.db/i],
  ["README npm workflow", files.readme, /(?:^|\n)\s*(?:npm install|npm run|npx prisma)\b/im],
  ["README unapproved MIT claim", files.readme, /licensed under the MIT/i],
  ["Preference legal compliance claim", files.preference, /GDPR\s*&\s*KVKK\s*Compliant/i],
  ["Report false SSO claim", files.reports, /SSO\s*&\s*RBAC\s*Aktif/i],
  ["Report false omnichannel claim", files.reports, /SMS ve WhatsApp kanalları kampanya yönetimine tam entegre edildi/i],
];

for (const [name, content, pattern] of forbidden) {
  if (pattern.test(content)) throw new Error(`Documentation truth check failed: ${name}`);
}

for (const required of [
  "controlled technical pilot",
  "Requires live acceptance",
  "Unavailable",
  "No open-source license has been approved",
]) {
  if (!files.readme.includes(required)) {
    throw new Error(`README is missing required evidence boundary: ${required}`);
  }
}

for (const required of ["OIDC/SAML SSO", "MFA and recovery codes", "SMS delivery", "MailerLite shutdown"]) {
  if (!files.capability.includes(required)) {
    throw new Error(`Capability matrix is missing: ${required}`);
  }
}

console.log("Documentation truth contract passed: setup, license, compliance, auth and channel boundaries");
