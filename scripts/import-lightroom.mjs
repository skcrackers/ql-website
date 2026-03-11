/**
 * 라이트룸 앨범 일괄 업로드 스크립트
 *
 * 사용법:
 *   node scripts/import-lightroom.mjs <내보낸_폴더_경로>
 *
 * 예시:
 *   node scripts/import-lightroom.mjs ~/Desktop/lightroom-export
 *
 * 폴더 구조 (라이트룸 내보내기 형식):
 *   lightroom-export/
 *     2023-01-16 신년회/
 *       IMG_001.jpg
 *       IMG_002.jpg
 *     2023-02-13 대법포럼/
 *       IMG_003.jpg
 *     ...
 *
 * 준비사항:
 *   - .env.local 에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 가 있어야 합니다.
 *   - 지원 이미지 형식: jpg, jpeg, png, webp, heic
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { readFile } from 'fs/promises';

// ─── 환경변수 로드 (.env.local) ────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = new URL('../.env.local', import.meta.url).pathname;
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  } catch {
    console.error('❌ .env.local 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);

// ─── 폴더명에서 날짜/제목 파싱 ────────────────────────────────────────────
function parseAlbumFolder(folderName) {
  // "2023-01-16 신년회" → { date: "2023-01-16", title: "신년회" }
  const match = folderName.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (!match) return null;
  return { date: match[1], title: match[2].trim() };
}

// ─── 이미지 파일 목록 가져오기 ─────────────────────────────────────────────
function getImageFiles(dirPath) {
  return readdirSync(dirPath)
    .filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort()
    .map(f => join(dirPath, f));
}

// ─── 단일 앨범 업로드 ──────────────────────────────────────────────────────
async function uploadAlbum(albumPath, albumInfo) {
  const { date, title } = albumInfo;
  const imageFiles = getImageFiles(albumPath);

  if (imageFiles.length === 0) {
    console.log(`  ⚠️  이미지 없음, 건너뜀`);
    return;
  }

  // 1. events 테이블에 이벤트 생성
  const { data: newEvent, error: eventError } = await supabase
    .from('events')
    .insert([{ title, date, description: '' }])
    .select()
    .single();

  if (eventError) {
    console.error(`  ❌ 이벤트 생성 실패: ${eventError.message}`);
    return;
  }

  console.log(`  ✅ 이벤트 생성됨 (id: ${newEvent.id})`);

  // 2. 이미지 업로드
  const uploadedUrls = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const filePath = imageFiles[i];
    const ext = extname(filePath).toLowerCase();
    const storageKey = `${newEvent.id}/${Date.now()}_${i}${ext}`;
    const buffer = await readFile(filePath);

    const contentType = ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : ext === '.heic' ? 'image/heic'
      : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(storageKey, buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error(`  ❌ 업로드 실패 (${basename(filePath)}): ${uploadError.message}`);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(storageKey);

    uploadedUrls.push(publicUrl);
    process.stdout.write(`\r  📸 업로드 중: ${i + 1}/${imageFiles.length}`);
  }
  console.log(`\r  📸 ${uploadedUrls.length}/${imageFiles.length}장 업로드 완료`);

  // 3. event_images 테이블에 URL 저장
  if (uploadedUrls.length > 0) {
    const imageRecords = uploadedUrls.map((url, idx) => ({
      event_id: newEvent.id,
      image_url: url,
      order_index: idx,
    }));

    const { error: imgError } = await supabase
      .from('event_images')
      .insert(imageRecords);

    if (imgError) {
      console.error(`  ❌ event_images 저장 실패: ${imgError.message}`);
    }
  }

  // 4. calendar_events 에도 자동 등록
  await supabase.from('calendar_events').insert([{
    title,
    date,
    time: null,
    type: '일반',
    description: '',
    location: '',
    created_by: 'event-sync',
  }]);

  console.log(`  🗓️  캘린더 등록 완료`);
}

// ─── 메인 실행 ─────────────────────────────────────────────────────────────
async function main() {
  const exportDir = process.argv[2];

  if (!exportDir) {
    console.log('사용법: node scripts/import-lightroom.mjs <내보낸_폴더_경로>');
    console.log('예시:   node scripts/import-lightroom.mjs ~/Desktop/lightroom-export');
    process.exit(1);
  }

  const resolvedDir = exportDir.replace(/^~/, process.env.HOME);

  let entries;
  try {
    entries = readdirSync(resolvedDir).filter(name => {
      const full = join(resolvedDir, name);
      return statSync(full).isDirectory();
    });
  } catch {
    console.error(`❌ 폴더를 읽을 수 없습니다: ${resolvedDir}`);
    process.exit(1);
  }

  const albums = entries
    .map(name => ({ name, info: parseAlbumFolder(name) }))
    .filter(a => a.info !== null)
    .sort((a, b) => a.info.date.localeCompare(b.info.date));

  const skipped = entries.length - albums.length;

  console.log(`\n📂 총 ${albums.length}개 앨범 발견 (형식 불일치 ${skipped}개 건너뜀)\n`);

  if (albums.length === 0) {
    console.log('⚠️  업로드할 앨범이 없습니다.');
    console.log('폴더명이 "YYYY-MM-DD 이벤트명" 형식인지 확인해 주세요.');
    process.exit(0);
  }

  let success = 0;
  for (let i = 0; i < albums.length; i++) {
    const { name, info } = albums[i];
    console.log(`\n[${i + 1}/${albums.length}] ${name}`);
    await uploadAlbum(join(resolvedDir, name), info);
    success++;
  }

  console.log(`\n✨ 완료! ${success}/${albums.length}개 앨범 업로드됨\n`);
}

main().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
