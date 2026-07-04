import { NextResponse } from "next/server";

type BinaryLike =
  | ArrayBuffer
  | Uint8Array
  | Buffer
  | number[]
  | { data?: number[] }
  | null
  | undefined;

function bytesFrom(data: BinaryLike) {
  if (!data) return null;
  if (data instanceof Uint8Array) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return new Uint8Array(data);
  if (Array.isArray(data.data)) return new Uint8Array(data.data);
  return null;
}

function fallbackFilename(filename: string) {
  const cleaned =
    filename
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim() || "download";

  return cleaned.replaceAll('"', "");
}

function encodedFilename(filename: string) {
  return encodeURIComponent(filename).replaceAll("'", "%27");
}

export function researchDownloadResponse({
  data,
  filename,
  contentType,
}: {
  data: BinaryLike;
  filename: string;
  contentType?: string | null;
}) {
  const bytes = bytesFrom(data);
  if (!bytes || bytes.byteLength === 0) return null;

  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(new Blob([body]), {
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${fallbackFilename(
        filename,
      )}"; filename*=UTF-8''${encodedFilename(filename)}`,
    },
  });
}
