/**
 * NAS에 남아있는 HEIC/HEIF 파일 정리 (삭제)
 *
 * WebDAV로 web/ql/events 하위를 순회하며 .heic/.heif 파일 삭제
 *
 * 사용법: node scripts/cleanup-heif-from-nas.mjs
 *
 * .env.local 필요: WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD
 */

import { createClient } from 'webdav';
import { readFileSync } from 'fs';

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

const webdavUrl = process.env.WEBDAV_URL || 'http://dav.skcrackers.co.kr:5005';
const webdav = createClient(webdavUrl, {
  username: process.env.WEBDAV_USERNAME,
  password: process.env.WEBDAV_PASSWORD,
});

function isHeifFile(name) {
  return /\.(heic|heif)$/i.test(name || '');
}

async function collectHeifFiles(dirPath, acc = []) {
  try {
    const items = await webdav.getDirectoryContents(dirPath);
    for (const item of items) {
      const fullPath = item.filename.startsWith('/') ? item.filename : `/${item.filename}`;
      if (item.type === 'directory') {
        await collectHeifFiles(fullPath, acc);
      } else if (item.type === 'file' && isHeifFile(item.basename)) {
        acc.push({ path: fullPath, name: item.basename });
      }
    }
  } catch (err) {
    console.error(`  ⚠️ 디렉토리 조회 실패 (${dirPath}): ${err.message}`);
  }
  return acc;
}

async function main() {
  console.log('\n🧹 NAS HEIC/HEIF 파일 정리 시작\n');

  if (!process.env.WEBDAV_USERNAME || !process.env.WEBDAV_PASSWORD) {
    console.error('❌ .env.local에 WEBDAV_USERNAME, WEBDAV_PASSWORD를 추가하세요.');
    process.exit(1);
  }

  console.log('📂 HEIC/HEIF 파일 스캔 중...');
  const heifFiles = await collectHeifFiles(WEBDAV_BASE);

  if (heifFiles.length === 0) {
    console.log('\n✅ 정리할 HEIC/HEIF 파일이 없습니다.\n');
    return;
  }

  console.log(`\n📋 삭제 대상: ${heifFiles.length}개\n`);

  let ok = 0;
  let fail = 0;

  for (const { path, name } of heifFiles) {
    try {
      await webdav.deleteFile(path);
      ok++;
      console.log(`  🗑️ 삭제됨: ${name}`);
    } catch (err) {
      fail++;
      console.log(`  ❌ 삭제 실패: ${name} - ${err.message}`);
    }
  }

  console.log(`\n✨ 완료! 삭제 ${ok}개, 실패 ${fail}개\n`);
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
