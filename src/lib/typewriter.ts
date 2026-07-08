const DEFAULT_TYPEWRITER_CHUNK_SIZE = 12;

export function nextTypewriterText(targetText: string, currentLength: number, chunkSize = DEFAULT_TYPEWRITER_CHUNK_SIZE) {
  const safeCurrentLength = Math.max(0, Math.min(currentLength, targetText.length));
  const safeChunkSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : DEFAULT_TYPEWRITER_CHUNK_SIZE;
  return targetText.slice(0, Math.min(targetText.length, safeCurrentLength + safeChunkSize));
}
