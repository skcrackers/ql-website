/** Supabase Storage URL 잔여 확인 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  const envPath = new URL('../.env.local', import.meta.url).pathname;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

loadEnv();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('event_images')
    .select('id, image_url')
    .like('image_url', '%supabase.co%');
  if (error) { console.error(error); process.exit(1); }
  const count = (data || []).length;
  console.log(count === 0
    ? '✅ Supabase Storage 참조 없음 (전부 NAS)'
    : `⚠️ Supabase 참조 ${count}개 남음`);
}

main();
