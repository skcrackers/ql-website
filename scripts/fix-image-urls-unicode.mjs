/**
 * 이미지 URL 유니코드 NFC 정규화
 * NFD(자모 분리)로 저장된 한글 경로를 NFC(조합형)로 변환
 *
 * 사용법: node scripts/fix-image-urls-unicode.mjs
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

function normalizeUrlToNFC(url) {
  try {
    const base = 'https://media.skcrackers.co.kr/ql/events/';
    if (!url.startsWith(base)) return url;
    const rest = url.slice(base.length);
    const parts = rest.split('/');
    const normalized = parts.map(part => {
      try {
        const decoded = decodeURIComponent(part);
        const nfc = decoded.normalize('NFC');
        return encodeURIComponent(nfc);
      } catch {
        return part;
      }
    });
    return base + normalized.join('/');
  } catch {
    return url;
  }
}

async function main() {
  console.log('\n🔄 URL 유니코드 NFC 정규화 시작...\n');

  const { data: images, error } = await supabase
    .from('event_images')
    .select('id, image_url')
    .like('image_url', 'https://media.skcrackers.co.kr%');

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    process.exit(1);
  }

  const toUpdate = [];
  for (const img of images) {
    const normalized = normalizeUrlToNFC(img.image_url);
    if (normalized !== img.image_url) {
      toUpdate.push({ id: img.id, old: img.image_url, new: normalized });
    }
  }

  console.log(`📋 수정 필요: ${toUpdate.length}개 / 전체 ${images.length}개\n`);

  if (toUpdate.length === 0) {
    console.log('✅ 수정할 URL이 없습니다.\n');
    return;
  }

  let success = 0;
  for (const { id, new: newUrl } of toUpdate) {
    const { error: updateError } = await supabase
      .from('event_images')
      .update({ image_url: newUrl })
      .eq('id', id);
    if (!updateError) {
      success++;
      if (success % 50 === 0) console.log(`  ⏳ ${success}/${toUpdate.length}개 완료...`);
    }
  }

  console.log(`\n✨ 완료! ${success}/${toUpdate.length}개 URL 정규화됨\n`);
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
