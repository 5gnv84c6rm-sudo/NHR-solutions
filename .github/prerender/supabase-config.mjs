// Writes ui_kits/website/supabase-config.js from the environment, so the
// publishable URL and key live in .env (or CI env) rather than in source.
// Run directly for local dev (npm run supabase:config); the prerender build
// calls writeConfig() so the published site gets the same file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET = path.join(ROOT, 'ui_kits/website/supabase-config.js');

function fromEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

export function writeConfig() {
  const file = fromEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || file.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || file.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  // The publishable key is sent to every browser by design; access is
  // controlled by row-level security. An empty config is not an error — the
  // forms fall back to browser storage, as the prototype always did.
  fs.writeFileSync(TARGET,
    '/* Generated from the environment by .github/prerender/supabase-config.mjs.\n' +
    '   Do not edit, and do not commit: run `npm run supabase:config`. */\n' +
    'window.NHR_SUPABASE = ' + JSON.stringify({ url, key }) + ';\n');

  return { url, key, configured: Boolean(url && key) };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('supabase-config.mjs')) {
  const r = writeConfig();
  console.log(r.configured
    ? `wrote supabase-config.js for ${r.url}`
    : 'wrote supabase-config.js with no credentials — forms will use browser storage');
}
