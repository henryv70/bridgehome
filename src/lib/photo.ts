import { useEffect, useState } from 'react';

const MAX_BYTES = 400_000;

// Downscale and re-encode a picked photo so it fits in a single database row.
export async function compressPhoto(file: File): Promise<{ bytes: Uint8Array; type: string; url: string }> {
  const bitmap = await createImageBitmap(file);
  for (const edge of [1280, 1024, 800, 640]) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.58]) {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
      if (!blob) throw Error('Could not read this photo.');
      if (blob.size <= MAX_BYTES) {
        return { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'image/jpeg', url: URL.createObjectURL(blob) };
      }
    }
  }
  throw Error('This photo is too large. Try a different one.');
}

const cache = new WeakMap<Uint8Array, string>();

// Stable object URL for photo bytes from a table row.
export function usePhotoUrl(bytes: Uint8Array | undefined, type: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!bytes?.length) return setUrl(undefined);
    let u = cache.get(bytes);
    if (!u) {
      u = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
      cache.set(bytes, u);
    }
    setUrl(u);
  }, [bytes, type]);
  return url;
}
