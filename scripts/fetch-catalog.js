#!/usr/bin/env node
import { writeFileSync } from 'fs';

const URL = 'https://static.ui.com/fingerprint/ui/public.json';

async function main() {
  console.log('Fetching catalog from', URL);
  const resp = await fetch(URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const path = new URL('../src/data/fallback.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  writeFileSync(path, JSON.stringify(json));
  console.log(`Wrote ${json.devices.length} devices to fallback.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
