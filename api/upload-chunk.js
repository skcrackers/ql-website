/**
 * 청크 업로드 API (Vercel 4.5MB 제한 우회)
 * 대용량 파일(100MB+ 동영상 등)을 4MB 청크로 나누어 NAS에 업로드
 */

import { createClient } from 'webdav';
import convert from 'heic-convert';

const PUBLIC_BASE = 'https://media.skcrackers.co.kr/ql/events';
const WEBDAV_BASE = 'web/ql/events';
const UPLOAD_DIR = 'web/ql/events/.chunks';

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
    if (chunk[chunk.length - 2] === 0x0d && chunk[chunk.length - 1] === 0x0a) bodyEnd -= 2;
    const bodyPart = chunk.subarray(bodyStart, bodyEnd);
    const nameMatch = head.match(/name="([^"]+)"/);
    const filenameMatch = head.match(/filename="([^"]*)"/);
    if (nameMatch) {
      const name = nameMatch[1];
      result[name] = filenameMatch
        ? { type: 'file', filename: filenameMatch[1], data: Buffer.from(bodyPart) }
        : { type: 'field', value: bodyPart.toString('utf8').trim() };
    }
  }
  return result;
}

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    return res.status(500).json({ error: 'WebDAV 환경변수 미설정' });
  }

  const client = createClient(WEBDAV_URL, {
    username: WEBDAV_USERNAME,
    password: WEBDAV_PASSWORD,
  });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';
    const boundary = getBoundary(contentType);

    if (!boundary) return res.status(400).json({ error: 'Invalid multipart' });

    const parsed = parseMultipart(body, boundary);
    const chunkData = parsed.chunk;
    const uploadId = parsed.uploadId?.value;
    const chunkIndex = parseInt(parsed.chunkIndex?.value ?? '-1', 10);
    const totalChunks = parseInt(parsed.totalChunks?.value ?? '0', 10);
    const date = parsed.date?.value;
    const title = parsed.title?.value;
    const indexVal = parsed.index?.value ?? '0';
    const filename = parsed.filename?.value || 'file';

    if (!chunkData || chunkData.type !== 'file' || !uploadId || chunkIndex < 0 || !totalChunks || !date || !title) {
      return res.status(400).json({ error: '필수 필드 누락' });
    }

    let fileData = chunkData.data;
    let ext = (filename || '').split('.').pop() || 'jpg';
    const isHeic = /\.(heic|heif)$/i.test(filename || '');

    if (isHeic && totalChunks === 1) {
      try {
        const result = await convert({ buffer: fileData, format: 'JPEG', quality: 0.92 });
        fileData = Buffer.isBuffer(result) ? result : Buffer.from(result);
        ext = 'jpg';
      } catch (err) {
        return res.status(500).json({ error: 'HEIC 변환 실패: ' + (err.message || '') });
      }
    }

    const chunkPath = `${UPLOAD_DIR}/${uploadId}/chunk-${chunkIndex}`;
    await client.createDirectory(`${UPLOAD_DIR}/${uploadId}`, { recursive: true });
    await client.putFileContents(chunkPath, fileData, { overwrite: true });

    if (chunkIndex === totalChunks - 1) {
      const year = date.slice(0, 4);
      const folderName = `${date} ${title}`;
      const dirPath = `${WEBDAV_BASE}/${year}/${folderName}`;

      const buffers = [];
      for (let i = 0; i < totalChunks; i++) {
        const p = `${UPLOAD_DIR}/${uploadId}/chunk-${i}`;
        const data = await client.getFileContents(p);
        buffers.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      }
      const fullBuffer = Buffer.concat(buffers);

      let finalData = fullBuffer;
      let finalExt = ext;
      if (isHeic && totalChunks > 1) {
        try {
          const result = await convert({ buffer: fullBuffer, format: 'JPEG', quality: 0.92 });
          finalData = Buffer.isBuffer(result) ? result : Buffer.from(result);
          finalExt = 'jpg';
        } catch {
          finalData = fullBuffer;
        }
      }

      const finalSafeName = `${String(parseInt(indexVal, 10) + 1).padStart(2, '0')}-${Date.now()}.${finalExt}`;

      await client.createDirectory(dirPath, { recursive: true });
      await client.putFileContents(`${dirPath}/${finalSafeName}`, finalData, { overwrite: true });

      for (let i = 0; i < totalChunks; i++) {
        try { await client.deleteFile(`${UPLOAD_DIR}/${uploadId}/chunk-${i}`); } catch {}
      }
      try { await client.deleteFile(`${UPLOAD_DIR}/${uploadId}`); } catch {}

      const publicUrl = `${PUBLIC_BASE}/${year}/${encodeURIComponent(folderName)}/${encodeURIComponent(finalSafeName)}`;
      return res.status(200).json({ url: publicUrl });
    }

    return res.status(200).json({ ok: true, chunkIndex });
  } catch (err) {
    console.error('Upload chunk error:', err);
    return res.status(500).json({ error: err.message || '업로드 실패' });
  }
}
