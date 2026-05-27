import { SpeakerLine } from "./types";

export const WHISPER_URL = "https://functions.poehali.dev/2c9ac17b-b681-4f85-9399-c68876c7bef7";
export const MAX_FILE_MB = 150;
export const CHUNK_MB = 24;
export const CHUNK_BYTES = CHUNK_MB * 1024 * 1024;

// Конвертирует ArrayBuffer → base64 без переполнения стека
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Отправляет один чанк на сервер, возвращает { lines, plain }
export async function sendChunk(
  chunk: ArrayBuffer,
  fileName: string,
  whisperLang: string,
  signal: AbortSignal,
): Promise<{ lines: SpeakerLine[]; plain: string }> {
  const b64 = arrayBufferToBase64(chunk);
  const resp = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: b64, language: whisperLang, fileName }),
    signal,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `Ошибка сервера ${resp.status}`);
  }
  const data = await resp.json();
  const lines: SpeakerLine[] = (data.lines ?? []).map((l: { speaker: number; text: string; time: string }) => ({
    speaker: l.speaker,
    text: l.text,
    time: l.time,
  }));
  return { lines, plain: data.plain ?? "" };
}
