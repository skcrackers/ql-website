/**
 * NAS WebDAV 업로드 API
 * 웹에서 업로드한 파일을 NAS에 저장하고 공개 URL 반환
 *
 * 환경변수 (Vercel):
 *   WEBDAV_URL      - http://dav.skcrackers.co.kr:5005
 *   WEBDAV_USERNAME - Synology 사용자명
 *   WEBDAV_PASSWORD - Synology 비밀번호
 */

import { createClient } from 'webdav';

const PUBLIC_BASE = 'https://media.skcrackers.co.kr/ql/events';
const WEBDAV_BASE = 'web/ql/events'; // Synology WebDAV: web = 공유폴더명

export const config = {
  api: {
    bodyParser: false, // multipart 직접 파싱
  },
};

function getBoundary(contentType) {
  const m = contentType?.match(/boundary=["']?([^"'\s;]+)/);
  return m ? m[1].trim() : null;
}

function parseMultipart(buffer, boundary) {
  const delim = Buffer.from(`\r\n--${boundary}`);
  const result = {};
  let pos = 0;
  while (pos < buffer.length) {
    const next = buffer.indexOf(delim, pos);
    const chunk = next < 0 ? buffer.subarray(pos) : buffer.subarray(pos, next);
    pos = next < 0 ? buffer.length : next + delim.length;
    if (chunk.length < 4) continue;
    const sep = Buffer.from('\r\n\r\n');
    const idx = chunk.indexOf(sep);
    if (idx < 0) continue;
    const head = chunk.subarray(0, idx).toString('utf8');
    const bodyStart = idx + 4;
    let bodyEnd = chunk.length;
    if (chunk[chunk.length - 2] === 0x0d && chunk[chunk.length - 1] === 0x0a) {
      bodyEnd -= 2;
    }
    const bodyPart = chunk.subarray(bodyStart, bodyEnd);
    const nameMatch = head.match(/name="([^"]+)"/);
    const filenameMatch = head.match(/filename="([^"]*)"/);
    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        result[name] = { type: 'file', filename: filenameMatch[1], data: Buffer.from(bodyPart) };
      } else {
        result[name] = { type: 'field', value: bodyPart.toString('utf8').trim() };
      }
    }
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return res.status(500).json({ error: 'WebDAV 환경변수 미설정' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';
    const boundary = getBoundary(contentType);
    if (!boundary) {
      return res.status(400).json({ error: 'Invalid multipart' });
    }

    const parsed = parseMultipart(body, boundary);
    const file = parsed.file;
    const date = parsed.date?.value;
    const title = parsed.title?.value;
    const index = parsed.index?.value ?? '0';

    if (!file || file.type !== 'file' || !date || !title) {
      return res.status(400).json({ error: 'file, date, title 필수' });
    }

    const year = date.slice(0, 4);
    const folderName = `${date} ${title}`;
    const ext = (file.filename || '').split('.').pop() || 'jpg';
    const safeName = `${String(parseInt(index, 10) + 1).padStart(2, '0')}-${Date.now()}.${ext}`;
    const dirPath = `${WEBDAV_BASE}/${year}/${folderName}`;
    const remotePath = `${dirPath}/${safeName}`;

    const client = createClient(WEBDAV_URL, {
      username: WEBDAV_USERNAME,
      password: WEBDAV_PASSWORD,
    });
    await client.createDirectory(dirPath, { recursive: true });
    await client.putFileContents(remotePath, file.data, { overwrite: true });

    const publicUrl = `${PUBLIC_BASE}/${year}/${encodeURIComponent(folderName)}/${encodeURIComponent(safeName)}`;
    return res.status(200).json({ url: publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || '업로드 실패' });
  }
}
