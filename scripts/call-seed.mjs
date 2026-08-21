import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.SETUP_TOKEN) {
    throw new Error('SETUP_TOKEN is required. Set it in .env.local or the shell environment.');
  }

  const res = await fetch('http://localhost:3000/api/seed/test-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setupToken: process.env.SETUP_TOKEN }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(e => console.error('Error:', e.message));
