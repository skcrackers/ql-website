/**
 * Supabase DB의 이미지 URL을 NAS URL로 일괄 업데이트
 *
 * 사용법:
 *   node scripts/update-image-urls.mjs
 *
 * 기존: http://skcrackers.co.kr/ql/events/...
 * 변경: https://media.skcrackers.co.kr/ql/events/...
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
  process.env.VITE_SUPABASE_ANON_KEY
);

const OLD_BASE = 'http://skcrackers.co.kr/ql/events';
const NEW_BASE = 'https://media.skcrackers.co.kr/ql/events';

async function main() {
  console.log('\n🔄 이미지 URL 업데이트 시작...\n');

  // 업데이트 대상 조회
  const { data: images, error } = await supabase
    .from('event_images')
    .select('id, image_url')
    .like('image_url', `${OLD_BASE}%`);

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📋 업데이트 대상: ${images.length}개\n`);

  if (images.length === 0) {
    console.log('✅ 업데이트할 항목이 없습니다.');
    return;
  }

  let success = 0;
  for (const img of images) {
    const newUrl = img.image_url.replace(OLD_BASE, NEW_BASE);
    const { error: updateError } = await supabase
      .from('event_images')
      .update({ image_url: newUrl })
      .eq('id', img.id);

    if (updateError) {
      console.error(`❌ 실패 (id: ${img.id}): ${updateError.message}`);
    } else {
      success++;
    }
  }

  console.log(`✨ 완료! ${success}/${images.length}개 URL 업데이트됨`);
  console.log(`\n변경: ${OLD_BASE}/...`);
  console.log(`   → ${NEW_BASE}/...\n`);
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
