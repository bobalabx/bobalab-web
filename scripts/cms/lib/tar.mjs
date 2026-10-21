/**
 * Minimal reader for npm tarballs (gzip + ustar, with pax and GNU long-name
 * headers). Read-only: it never writes entries to disk, so a hostile path in a
 * tarball cannot escape anything. Used by scripts/cms/vendor-decap.mjs.
 */
import zlib from "node:zlib";

function cstr(buf, start, len) {
  const slice = buf.subarray(start, start + len);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul === -1 ? slice.length : nul).toString("utf8");
}

function octal(buf, start, len) {
  const s = cstr(buf, start, len).trim();
  return s ? parseInt(s, 8) : 0;
}

/** Parse pax extended-header records ("<len> key=value\n"). */
function paxRecords(data) {
  const out = {};
  let off = 0;
  const text = data.toString("utf8");
  while (off < text.length) {
    const sp = text.indexOf(" ", off);
    if (sp === -1) break;
    const len = parseInt(text.slice(off, sp), 10);
    if (!Number.isFinite(len) || len <= 0) break;
    const record = text.slice(sp + 1, off + len - 1);
    const eq = record.indexOf("=");
    if (eq > 0) out[record.slice(0, eq)] = record.slice(eq + 1);
    off += len;
  }
  return out;
}

/**
 * Iterate the regular-file entries of a .tgz buffer.
 * @param {Buffer} tgz
 * @returns {Generator<{ path: string, size: number, data: Buffer }>}
 */
export function* tgzEntries(tgz) {
  const buf = zlib.gunzipSync(tgz);
  let off = 0;
  let nextPath = null;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const name = cstr(header, 0, 100);
    const size = octal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const magic = cstr(header, 257, 6);
    const prefix = magic.startsWith("ustar") ? cstr(header, 345, 155) : "";
    off += 512;
    const data = buf.subarray(off, off + size);
    off += Math.ceil(size / 512) * 512;

    if (type === "x") {
      const rec = paxRecords(data);
      if (rec.path) nextPath = rec.path;
      continue;
    }
    if (type === "g") continue;
    if (type === "L") {
      nextPath = cstr(data, 0, data.length);
      continue;
    }
    const full = nextPath ?? (prefix ? `${prefix}/${name}` : name);
    nextPath = null;
    if (type === "0" || type === "\0") yield { path: full, size, data: Buffer.from(data) };
  }
}

/** Return one file's bytes from a .tgz buffer, or null. */
export function readTgzFile(tgz, wanted) {
  for (const e of tgzEntries(tgz)) if (e.path === wanted) return e.data;
  return null;
}
