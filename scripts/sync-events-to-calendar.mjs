/**
 * 이미지 있는 이벤트 → 캘린더 등록
 *
 * events 테이블 중 event_images가 1개 이상인 이벤트를
 * calendar_events에 없으면 등록합니다.
 *
 * 사용법: node scripts/sync-events-to-calendar.mjs
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
  console.log('\n📅 이벤트 → 캘린더 동기화 시작\n');

  const { data: eventsWithImages, error: evErr } = await supabase
    .from('events')
    .select('id, title, date, description')
    .order('date', { ascending: false });

  if (evErr) {
    console.error('❌ 이벤트 조회 실패:', evErr.message);
    process.exit(1);
  }

  const { data: imageCounts } = await supabase
    .from('event_images')
    .select('event_id');

  const eventIdsWithImages = new Set();
  (imageCounts || []).forEach((r) => eventIdsWithImages.add(r.event_id));

  const eventsToSync = (eventsWithImages || []).filter((e) => eventIdsWithImages.has(e.id));

  if (eventsToSync.length === 0) {
    console.log('✅ 이미지가 있는 이벤트가 없습니다.\n');
    return;
  }

  const { data: existingCal, error: calErr } = await supabase
    .from('calendar_events')
    .select('date, title');

  if (calErr) {
    console.error('❌ 캘린더 조회 실패:', calErr.message);
    process.exit(1);
  }

  const calKeys = new Set((existingCal || []).map((c) => `${c.date}__${c.title}`));

  const toInsert = eventsToSync.filter((e) => !calKeys.has(`${e.date}__${e.title}`));

  if (toInsert.length === 0) {
    console.log(`✅ 이미지 이벤트 ${eventsToSync.length}개 모두 캘린더에 등록되어 있습니다.\n`);
    return;
  }

  console.log(`📋 캘린더 미등록 이벤트: ${toInsert.length}개\n`);

  for (const evt of toInsert) {
    const { error: insErr } = await supabase.from('calendar_events').insert([
      {
        title: evt.title,
        date: evt.date,
        time: null,
        type: '일반',
        description: evt.description || '',
        location: '',
        created_by: 'event-sync',
      },
    ]);

    if (insErr) {
      console.log(`  ❌ 실패: ${evt.date} ${evt.title} - ${insErr.message}`);
    } else {
      console.log(`  ✅ 등록: ${evt.date} ${evt.title}`);
    }
  }

  console.log('\n✨ 동기화 완료\n');
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
