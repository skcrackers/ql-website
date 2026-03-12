/**
 * 2024-04 앨범 이미지 개별 테스트
 * - 현재 썸네일(첫 번째)이 로드되는지 확인
 * - 로드 실패하는 이미지 패턴 파악
 * - 로드 가능한 대안 썸네일 후보 제시
 *
 * 사용법: node scripts/diagnose-album-2024-04.mjs
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
  console.log('\n🔍 2024-04 앨범 이미지 진단\n');

  // 2024-04 이벤트 조회 (date가 2024-04로 시작하는 것)
  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id, title, date')
    .gte('date', '2024-04-01')
    .lt('date', '2024-05-01');

  if (eventsErr) {
    console.error('❌ 이벤트 조회 실패:', eventsErr.message);
    process.exit(1);
  }

  if (!events?.length) {
    console.log('2024-04 이벤트가 없습니다.');
    process.exit(0);
  }

  for (const evt of events) {
    console.log(`\n📁 ${evt.title} (${evt.date}) [event_id: ${evt.id}]\n`);

    const { data: images, error: imgErr } = await supabase
      .from('event_images')
      .select('id, image_url, order_index')
      .eq('event_id', evt.id)
      .order('order_index', { ascending: true });

    if (imgErr) {
      console.error('  ❌ 이미지 조회 실패:', imgErr.message);
      continue;
    }

    const results = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const filename = img.image_url.split('/').pop();
      const result = await fetchWithTimeout(img.image_url);
      const ok = result.ok || result.status === 200;
      results.push({ ...img, ok, status: result.status, filename });
      process.stdout.write(ok ? '.' : 'x');
    }
    console.log('\n');

    const okList = results.filter(r => r.ok);
    const failList = results.filter(r => !r.ok);

    // 파일 형식별 분류 (브라우저 호환성)
    const isWebFriendly = (fn) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(fn || '');
    const heicList = results.filter(r => /\.heic(\?|$)/i.test(r.filename || ''));
    const webFriendlyList = results.filter(r => isWebFriendly(r.filename));

    console.log(`  ✅ HTTP 로드 성공: ${okList.length}장`);
    console.log(`  ❌ HTTP 로드 실패: ${failList.length}장`);
    console.log(`  ⚠️  HEIC 파일: ${heicList.length}장 (Chrome/Edge/Firefox에서 미지원, Safari만 표시)`);
    console.log(`  🌐 웹 호환 형식 (jpg/png/webp): ${webFriendlyList.length}장\n`);

    // 현재 썸네일(첫 번째) 상태
    const thumbnail = results[0];
    const thumbIsHeic = /\.heic(\?|$)/i.test(thumbnail.filename || '');
    console.log(`  📌 현재 썸네일 (order_index 최소 = 첫 번째):`);
    console.log(`     파일: ${thumbnail.filename}`);
    console.log(`     HTTP: ${thumbnail.ok ? '✅ 200' : `❌ ${thumbnail.status ?? thumbnail.error}`}`);
    if (thumbIsHeic) {
      console.log(`     ⚠️  HEIC 형식 → Chrome/Edge 등에서 깨져 보입니다. JPG/PNG로 썸네일을 바꾸는 것을 권장합니다.\n`);
    } else {
      console.log('');
    }

    if (failList.length > 0) {
      console.log('  --- HTTP 실패한 이미지 목록 ---');
      failList.slice(0, 15).forEach((f, i) => {
        console.log(`     [${i + 1}] ${f.filename} → ${f.status ?? f.error}`);
      });
      if (failList.length > 15) console.log(`     ... 외 ${failList.length - 15}개`);
      console.log('');
    }

    // 썸네일이 HEIC이거나 실패 시 → 웹 호환 대안 제시
    const needsAlternate = thumbIsHeic || !thumbnail.ok;
    if (needsAlternate && webFriendlyList.length > 0) {
      console.log('  💡 썸네일 대안 (JPG/PNG 등 웹 호환 형식, 편집 모드에서 "썸네일 설정"으로 적용):');
      webFriendlyList.slice(0, 5).forEach((r, i) => {
        console.log(`     [${i + 1}] order_index=${r.order_index} → ${r.filename} (id: ${r.id})`);
      });
      console.log('');
    }
  }

  console.log('✨ 진단 완료\n');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
