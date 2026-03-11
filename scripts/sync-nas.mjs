/**
 * NAS → Supabase DB 동기화 스크립트
 *
 * NAS에 이미 업로드된 이미지를 Supabase DB에 등록합니다.
 * 파일 업로드는 하지 않고 URL만 DB에 저장합니다.
 *
 * 사용법:
 *   node scripts/sync-nas.mjs
 *
 * 사전 조건:
 *   - Finder에서 WebDAV로 NAS가 마운트되어 있어야 합니다.
 *     (http://skcrackers.co.kr:5005 로 연결)
 *   - NAS 폴더 구조: /Volumes/skcrackers.co.kr/web/ql/events/{연도}/{YYYY-MM-DD 이벤트명}/
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ─── 설정 ──────────────────────────────────────────────────────────────────
const NAS_MOUNT_PATH = '/Volumes/skcrackers.co.kr/web/ql/events';
const PUBLIC_BASE_URL = 'http://skcrackers.co.kr/ql/events';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.JPG', '.JPEG', '.PNG']);

// ─── 환경변수 로드 ─────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = new URL('../.env.local', import.meta.url).pathname;
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  } catch {
    console.error('❌ .env.local 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// ─── 유틸 ──────────────────────────────────────────────────────────────────
function parseAlbumName(name) {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (!match) return null;
  return { date: match[1], title: match[2].trim() };
}

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function getImageFiles(dir) {
  try {
    return readdirSync(dir)
      .filter(f => {
        const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
        return IMAGE_EXTS.has(ext) || IMAGE_EXTS.has(f.slice(f.lastIndexOf('.')));
      })
      .sort();
  } catch { return []; }
}

function buildUrl(...parts) {
  return parts
    .map(p => p.split('/').map(encodeURIComponent).join('/'))
    .join('/');
}

// ─── 이미 등록된 이벤트 조회 ───────────────────────────────────────────────
async function getExistingEvents() {
  const { data } = await supabase.from('events').select('id, title, date');
  return new Map((data || []).map(e => [`${e.date}__${e.title}`, e.id]));
}

// ─── 단일 앨범 등록 ────────────────────────────────────────────────────────
async function syncAlbum(yearDir, albumName, existing) {
  const info = parseAlbumName(albumName);
  if (!info) {
    console.log(`  ⚠️  형식 불일치, 건너뜀: ${albumName}`);
    return;
  }

  const { date, title } = info;
  const key = `${date}__${title}`;

  // 중복 체크
  if (existing.has(key)) {
    console.log(`  ⏭️  이미 등록됨: ${title}`);
    return;
  }

  const albumPath = join(yearDir, albumName);
  const images = getImageFiles(albumPath);

  if (images.length === 0) {
    console.log(`  ⚠️  이미지 없음, 건너뜀`);
    return;
  }

  // 연도 추출 (경로에서)
  const year = date.slice(0, 4);

  // 1. events 테이블 등록
  const { data: newEvent, error: eventError } = await supabase
    .from('events')
    .insert([{ title, date, description: '' }])
    .select()
    .single();

  if (eventError) {
    console.error(`  ❌ 이벤트 등록 실패: ${eventError.message}`);
    return;
  }

  // 2. event_images 등록 (NAS 공개 URL)
  const imageRecords = images.map((filename, idx) => ({
    event_id: newEvent.id,
    image_url: `${PUBLIC_BASE_URL}/${year}/${encodeURIComponent(albumName)}/${encodeURIComponent(filename)}`,
    order_index: idx,
  }));

  const { error: imgError } = await supabase
    .from('event_images')
    .insert(imageRecords);

  if (imgError) {
    console.error(`  ❌ 이미지 등록 실패: ${imgError.message}`);
    return;
  }

  // 3. calendar_events 등록
  await supabase.from('calendar_events').insert([{
    title,
    date,
    time: null,
    type: '일반',
    description: '',
    location: '',
    created_by: 'event-sync',
  }]);

  console.log(`  ✅ ${title} (${images.length}장) 등록 완료`);
}

// ─── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 NAS 폴더 스캔 시작...\n');

  // 마운트 확인
  try { readdirSync(NAS_MOUNT_PATH); }
  catch (e) {
    console.error(`❌ NAS 접근 실패: ${e.message}`);
    console.error(`   경로: ${NAS_MOUNT_PATH}`);
    console.error(`   Finder → Cmd+K → http://skcrackers.co.kr:5005 로 연결해주세요.`);
    process.exit(1);
  }

  const existing = await getExistingEvents();
  console.log(`📋 기존 등록된 이벤트: ${existing.size}개\n`);

  // 연도 폴더 순회
  const years = readdirSync(NAS_MOUNT_PATH)
    .filter(y => /^\d{4}$/.test(y) && isDir(join(NAS_MOUNT_PATH, y)))
    .sort();

  let total = 0, synced = 0;

  for (const year of years) {
    const yearDir = join(NAS_MOUNT_PATH, year);
    const albums = readdirSync(yearDir)
      .filter(a => isDir(join(yearDir, a)) && parseAlbumName(a))
      .sort();

    console.log(`📁 ${year} - ${albums.length}개 앨범`);

    for (const album of albums) {
      total++;
      process.stdout.write(`  [${album}]\n`);
      await syncAlbum(yearDir, album, existing);
      synced++;
    }
    console.log('');
  }

  console.log(`✨ 완료! 총 ${total}개 앨범 처리됨\n`);
  console.log(`🌐 이미지 공개 URL 예시:`);
  console.log(`   ${PUBLIC_BASE_URL}/2023/2023-01-16%20신년회/photo.jpg\n`);
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
