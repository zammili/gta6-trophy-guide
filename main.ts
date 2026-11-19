// Leonida Ledger — hand-in program for the gta6-trophy-guide-01 entry.
//
// The guide itself is the static web app in app/ (plain files, no build step,
// nothing fetched over the network). This program's only job is to hand it
// in: copy app/ and screenshots/ into the output directory and write a
// dossier.json there with the kit's vendored buildDossier, exactly as the
// competition contract requires — the scorer rebuilds the dossier with its
// own copy of the same library and compares the two byte for byte, so the
// caps below are the scorer's caps, not a local choice.
//
// Where the files go: /output inside the grader; locally, the
// MAKEFUN_OUTPUT_DIR environment variable stands in for it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the app first, then the screenshots beside it.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier: judge-facing summary of the screenshots and the app's source.
// The limits refuse anything the scorer would refuse anyway (over 4
// screenshots or one over 256 KiB; over 993 files or 48 MiB under app/).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
