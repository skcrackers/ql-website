/**
 * 앨범 내 모든 이미지 URL 테스트 (앨범당 1개가 아닌 전부)
 * 사용법: node scripts/diagnose-all-urls.mjs
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

async function fetchWithTimeout(url, timeout = 6000) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeout) });
    return res.status;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('\n🔍 전체 이미지 URL 테스트 (샘플)...\n');

  const { data: images, error } = await supabase
    .from('event_images')
    .select('id, image_url')
    .like('image_url', 'https://media.skcrackers.co.kr%');

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    process.exit(1);
  }

  // 앨범별로 그룹 (경로로)
  const byAlbum = new Map();
  for (const img of images) {
    const m = img.image_url.match(/\/events\/(\d{4})\/([^/]+)\/[^/]+$/);
    if (m) {
      const key = `${m[1]}/${decodeURIComponent(m[2])}`;
      if (!byAlbum.has(key)) byAlbum.set(key, []);
      byAlbum.get(key).push(img);
    }
  }

  let totalOk = 0, totalFail = 0;
  const failedSamples = [];

  for (const [albumPath, imgs] of byAlbum) {
    const results = await Promise.all(imgs.map(async (img) => ({
      id: img.id,
      url: img.image_url,
      status: await fetchWithTimeout(img.image_url),
    })));
    const ok = results.filter(r => r.status === 200).length;
    const fail = results.filter(r => r.status !== 200).length;
    totalOk += ok;
    totalFail += fail;
    if (fail > 0) {
      const failed = results.filter(r => r.status !== 200);
      failedSamples.push({ album: albumPath, failed: failed.slice(0, 3), total: imgs.length });
    }
  }

  console.log(`✅ 성공: ${totalOk}개`);
  console.log(`❌ 실패: ${totalFail}개\n`);

  if (failedSamples.length > 0) {
    console.log('--- 실패한 앨범 샘플 ---');
    for (const s of failedSamples.slice(0, 5)) {
      console.log(`\n📁 ${s.album} (${s.failed.length}개 실패 / 전체 ${s.total}장)`);
      for (const f of s.failed) {
        const fn = f.url.split('/').pop();
        console.log(`   ${fn} → ${f.status ?? 'timeout'}`);
      }
    }
  }
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
