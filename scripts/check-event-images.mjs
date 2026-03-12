/**
 * 특정 이벤트의 이미지/URL 상태 확인
 * 사용법: node scripts/check-event-images.mjs [제목일부]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  try {
    const envPath = new URL('../.env.local', import.meta.url).pathname;
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  } catch {
    console.error('❌ .env.local 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const filter = process.argv[2] || '부모임';
  console.log(`\n🔍 "${filter}" 포함 이벤트 이미지 확인\n`);

  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('id, title, date')
    .ilike('title', `%${filter}%`);

  if (evErr) {
    console.error('❌ 조회 실패:', evErr.message);
    process.exit(1);
  }

  for (const evt of events || []) {
    const { data: imgs, error: imgErr } = await supabase
      .from('event_images')
      .select('id, image_url, order_index')
      .eq('event_id', evt.id)
      .order('order_index');

    console.log(`📁 ${evt.title} (${evt.date}) [event_id: ${evt.id}]`);
    console.log(`   event_images: ${imgs?.length ?? 0}개\n`);

    if (imgs?.length > 0) {
      for (let i = 0; i < Math.min(imgs.length, 3); i++) {
        const img = imgs[i];
        try {
          const res = await fetch(img.image_url, { method: 'HEAD' });
          console.log(`   [${i}] ${res.status === 200 ? '✅' : '❌'} ${res.status} ${img.image_url.slice(-50)}`);
        } catch (e) {
          console.log(`   [${i}] ❌ fetch 실패: ${e.message}`);
        }
      }
      if (imgs.length > 3) console.log(`   ... 외 ${imgs.length - 3}개`);
    } else {
      console.log('   ⚠️ event_images 없음 - 업로드가 DB에 반영되지 않았을 수 있음');
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
