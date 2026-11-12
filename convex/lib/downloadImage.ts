export const downloadImage = async (url: string): Promise<Blob> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (
    !response.ok ||
    !type ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(type) ||
    !response.body
  ) {
    throw new Error('Image download failed or is not a supported image.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 250000) {
      await reader.cancel();
      throw new Error('Image exceeds 250 KB.');
    }
    chunks.push(new Uint8Array(value));
  }
  if (!size) throw new Error('Image is empty.');
  return new Blob(chunks, { type });
};
