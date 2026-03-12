/**
 * NAS 기존 HEIC/HEIF → JPG 변환 마이그레이션
 *
 * DB에 등록된 HEIC/HEIF 이미지를 다운로드 → JPG 변환 → NAS 업로드 → DB URL 갱신 → 원본 삭제
 *
 * 사용법: node scripts/convert-heif-to-jpg.mjs
 *
 * .env.local 필요:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY
 *   WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';
import { createClient as createWebdavClient } from 'webdav';
import { readFileSync } from 'fs';
import convert from 'heic-convert';

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

function parseUrlToPaths(url) {
  const match = url.match(/\/ql\/events\/(.+)$/);
  if (!match) return null;
  const rest = match[1];
  const parts = rest.split('/').map(p => decodeURIComponent(p));
  if (parts.length < 3) return null;
  const [year, folderName, ...filenameParts] = parts;
  const filename = filenameParts.join('/');
  return { year, folderName: folderName.normalize('NFC'), filename };
}

async function main() {
  console.log('\n🔄 HEIC/HEIF → JPG 변환 마이그레이션 시작\n');

  if (!process.env.WEBDAV_USERNAME || !process.env.WEBDAV_PASSWORD) {
    console.error('❌ .env.local에 WEBDAV_USERNAME, WEBDAV_PASSWORD를 추가하세요.');
    process.exit(1);
  }

  const { data: images, error: imgError } = await supabase
    .from('event_images')
    .select('id, image_url, order_index, event_id');

  if (imgError) {
    console.error('❌ 이미지 조회 실패:', imgError.message);
    process.exit(1);
  }

  const heifImages = (images || []).filter((img) =>
    /\.(heic|heif)(\?|$)/i.test(img.image_url || '')
  );

  console.log(`📋 변환 대상: ${heifImages.length}개 (HEIC/HEIF)\n`);

  if (heifImages.length === 0) {
    console.log('✅ 변환할 HEIC/HEIF 이미지가 없습니다.\n');
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const img of heifImages) {
    const paths = parseUrlToPaths(img.image_url);
    if (!paths) {
      console.log(`  ⚠️ URL 파싱 실패 (id: ${img.id}): ${img.image_url?.slice(0, 60)}...`);
      fail++;
      continue;
    }

    const { year, folderName, filename } = paths;
    const baseName = filename.replace(/\.(heic|heif)$/i, '');
    const newFilename = `${baseName}.jpg`;
    const webdavOldPath = `${WEBDAV_BASE}/${year}/${folderName}/${filename}`;
    const webdavNewPath = `${WEBDAV_BASE}/${year}/${folderName}/${newFilename}`;

    try {
      const res = await fetch(img.image_url);
      if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
      const heicBuffer = Buffer.from(await res.arrayBuffer());

      const jpegResult = await convert({
        buffer: heicBuffer,
        format: 'JPEG',
        quality: 0.92,
      });
      const jpegBuffer = Buffer.isBuffer(jpegResult) ? jpegResult : Buffer.from(jpegResult);

      const dirPath = `${WEBDAV_BASE}/${year}/${folderName}`;
      await webdav.createDirectory(dirPath, { recursive: true });
      await webdav.putFileContents(webdavNewPath, jpegBuffer, { overwrite: true });

      const newUrl = `${PUBLIC_BASE}/${year}/${encodeURIComponent(folderName)}/${encodeURIComponent(newFilename)}`;

      const { error: updateErr } = await supabase
        .from('event_images')
        .update({ image_url: newUrl })
        .eq('id', img.id);

      if (updateErr) throw updateErr;

      try {
        await webdav.deleteFile(webdavOldPath);
      } catch (delErr) {
        console.log(`  ⚠️ 원본 삭제 실패 (무시): ${filename} - ${delErr.message}`);
      }

      ok++;
      console.log(`  ✅ ${filename} → ${newFilename} (id: ${img.id})`);
    } catch (err) {
      fail++;
      console.log(`  ❌ 실패 (id: ${img.id}, ${filename}): ${err.message}`);
    }
  }

  console.log(`\n✨ 완료! 성공 ${ok}개, 실패 ${fail}개\n`);
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
