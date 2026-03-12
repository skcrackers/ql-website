/**
 * 이미지 URL 진단 스크립트
 * DB에 저장된 URL 샘플을 HTTP로 테스트하여 접근 가능 여부 확인
 *
 * 사용법: node scripts/diagnose-image-urls.mjs
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

async function fetchWithTimeout(url, timeout = 8000) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'QL-Website-Diagnostic/1.0' },
      signal: AbortSignal.timeout(timeout),
    });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    return { status: null, ok: false, error: err.message };
  }
}

async function main() {
  console.log('\n🔍 이미지 URL 진단 시작...\n');

  const { data: images, error } = await supabase
    .from('event_images')
    .select('id, image_url, event_id')
    .like('image_url', 'https://media.skcrackers.co.kr%');

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📋 media.skcrackers.co.kr URL: ${images.length}개\n`);

  // 앨범별로 1개씩 샘플 (연도/폴더 기준)
  const sampled = new Map();
  for (const img of images) {
    const m = img.image_url.match(/\/events\/(\d{4})\/([^/]+)\//);
    if (m) {
      const key = `${m[1]}/${m[2]}`;
      if (!sampled.has(key)) sampled.set(key, img);
    }
  }

  console.log(`🧪 앨범별 대표 URL ${sampled.size}개 테스트 중...\n`);

  let ok = 0, fail = 0;
  const failed = [];

  for (const [path, img] of sampled) {
    const result = await fetchWithTimeout(img.image_url);
    if (result.ok || result.status === 200) {
      ok++;
      process.stdout.write('.');
    } else {
      fail++;
      failed.push({ path, url: img.image_url, status: result.status, error: result.error });
      process.stdout.write('x');
    }
  }

  console.log('\n');
  console.log(`✅ 성공: ${ok}개`);
  console.log(`❌ 실패: ${fail}개\n`);

  if (failed.length > 0) {
    console.log('--- 실패한 URL 샘플 (최대 5개) ---');
    failed.slice(0, 5).forEach((f, i) => {
      console.log(`\n[${i + 1}] ${f.path}`);
      console.log(`    상태: ${f.status || f.error}`);
      console.log(`    URL: ${f.url.slice(0, 100)}...`);
    });

    // 이중 인코딩 검사
    const doubleEncoded = images.filter(u => u.image_url.includes('%25'));
    if (doubleEncoded.length > 0) {
      console.log(`\n⚠️  이중 인코딩 의심 (%25 포함): ${doubleEncoded.length}개`);
    }
  }
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
