import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const env: Record<string, string> = {};
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!env[key]) {
            env[key] = val;
          }
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const password = env.SUPABASE_PASSWORD;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = match ? match[1] : '';

if (!password || !projectRef) {
  console.error('Missing password or projectRef');
  process.exit(1);
}

console.log(`Pushing migrations to projectRef: ${projectRef}...`);

try {
  const pushCmd = `npx supabase db push --project-ref "${projectRef}" --password "${password}" --include-all`;
  const pushOut = execSync(pushCmd, { stdio: 'pipe', encoding: 'utf8' });
  console.log(pushOut);
} catch (err: any) {
  console.error('Push error status:', err.status);
  console.error('stdout:', err.stdout);
  console.error('stderr:', err.stderr);
  process.exit(1);
}
