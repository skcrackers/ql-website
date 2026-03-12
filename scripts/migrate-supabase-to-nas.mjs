/**
 * Supabase Storage → NAS 이미지 마이그레이션
 *
 * Supabase에 저장된 이미지를 NAS로 복사하고 DB URL을 업데이트합니다.
 *
 * 사용법: node scripts/migrate-supabase-to-nas.mjs
 *
 * .env.local 필요:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY
 *   WEBDAV_URL (기본: http://dav.skcrackers.co.kr:5005)
 *   WEBDAV_USERNAME, WEBDAV_PASSWORD  (Synology 로그인)
 */

import { createClient } from '@supabase/supabase-js';
import { createClient as createWebdavClient } from 'webdav';
import { readFileSync } from 'fs';

const PUBLIC_BASE = 'https://media.skcrackers.co.kr/ql/events';
const WEBDAV_BASE = 'web/ql/events';

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

const webdavUrl = process.env.WEBDAV_URL || 'http://dav.skcrackers.co.kr:5005';
const webdav = createWebdavClient(webdavUrl, {
  username: process.env.WEBDAV_USERNAME,
  password: process.env.WEBDAV_PASSWORD,
});

async function main() {
  console.log('\n🔄 Supabase Storage → NAS 마이그레이션 시작...\n');

  if (!process.env.WEBDAV_USERNAME || !process.env.WEBDAV_PASSWORD) {
    console.error('❌ .env.local에 WEBDAV_USERNAME, WEBDAV_PASSWORD를 추가하세요.');
    process.exit(1);
  }

  const { data: images, error: imgError } = await supabase
    .from('event_images')
    .select('id, image_url, order_index, event_id')
    .like('image_url', '%event-images%');

  if (imgError) {
    console.error('❌ 이미지 조회 실패:', imgError.message);
    process.exit(1);
  }

  const toMigrate = (images || []).filter(img => img.image_url?.includes('supabase.co'));
  console.log(`📋 마이그레이션 대상: ${toMigrate.length}개\n`);

  if (toMigrate.length === 0) {
    console.log('✅ 옮길 Supabase 이미지가 없습니다.\n');
    return;
  }

  const eventIds = [...new Set(toMigrate.map(i => i.event_id).filter(Boolean))];
  const { data: eventsData, error: evError } = await supabase
    .from('events')
    .select('id, title, date')
    .in('id', eventIds);

  if (evError) {
    console.error('❌ 이벤트 조회 실패:', evError.message);
    process.exit(1);
  }

  const eventMap = new Map((eventsData || []).map(e => [e.id, e]));

  let ok = 0, fail = 0;

  for (const img of toMigrate) {
    const event = eventMap.get(img.event_id);
    if (!event?.date || !event?.title) {
      console.log(`  ⚠️ 이벤트 정보 없음 (id: ${img.id}), 건너뜀`);
      fail++;
      continue;
    }

    const year = event.date.slice(0, 4);
    const folderName = `${event.date} ${event.title}`.normalize('NFC');
    const dirPath = `${WEBDAV_BASE}/${year}/${folderName}`;

    const urlParts = img.image_url.split('/');
    const origFilename = urlParts[urlParts.length - 1] || `img_${img.id}`;
    const ext = origFilename.includes('.') ? origFilename.slice(origFilename.lastIndexOf('.')) : '.jpg';
    const safeName = `${String((img.order_index ?? 0) + 1).padStart(2, '0')}-${Date.now()}${ext}`;
    const remotePath = `${dirPath}/${safeName}`;

    try {
      const res = await fetch(img.image_url);
      if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      await webdav.createDirectory(dirPath, { recursive: true });
      await webdav.putFileContents(remotePath, buffer, { overwrite: true });

      const newUrl = `${PUBLIC_BASE}/${year}/${encodeURIComponent(folderName)}/${encodeURIComponent(safeName)}`;

      const { error: updateErr } = await supabase
        .from('event_images')
        .update({ image_url: newUrl })
        .eq('id', img.id);

      if (updateErr) throw updateErr;

      ok++;
      if (ok % 10 === 0) console.log(`  ⏳ ${ok}/${toMigrate.length}개 완료...`);
    } catch (err) {
      fail++;
      console.log(`  ❌ 실패 (id: ${img.id}): ${err.message}`);
    }
  }

  console.log(`\n✨ 완료! 성공 ${ok}개, 실패 ${fail}개\n`);
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
