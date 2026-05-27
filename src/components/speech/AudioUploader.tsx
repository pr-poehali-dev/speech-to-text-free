import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { SpeakerLine, SpeechRecognitionInstance } from "./types";
import { WaveVisualizer, MicButton } from "./MicControls";
import { ExportPanel, TranscriptSavePanel, SpeakerView } from "./TranscriptPanel";
import { MAX_FILE_MB, CHUNK_BYTES, sendChunk } from "./whisperApi";

// ─── Audio Uploader ───────────────────────────────────────────────────────────

export function AudioUploader({ lang, onResult }: { lang: string; onResult: (lines: SpeakerLine[], plain: string) => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [chunkInfo, setChunkInfo] = useState<{ current: number; total: number } | null>(null);
  const [resultLines, setResultLines] = useState<SpeakerLine[]>([]);
  const [resultPlain, setResultPlain] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetAll = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setFileName("");
    setFileSize(0);
    setProgress(0);
    setChunkInfo(null);
    setErrorMsg("");
    setResultLines([]);
    setResultPlain("");
  };

  const whisperLang = lang.split("-")[0];

  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(`Файл слишком большой. Максимум ${MAX_FILE_MB} МБ.`);
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setStatus("uploading");
    setProgress(0);
    setChunkInfo(null);
    setResultLines([]);
    setResultPlain("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Разбиваем на чанки по CHUNK_BYTES
      const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_BYTES);
      setChunkInfo({ current: 0, total: totalChunks });

      const allLines: SpeakerLine[] = [];
      const allPlainParts: string[] = [];
      // Смещение спикеров между чанками: последний speaker idx предыдущего чанка
      let speakerOffset = 0;

      for (let i = 0; i < totalChunks; i++) {
        if (controller.signal.aborted) return;

        setChunkInfo({ current: i + 1, total: totalChunks });
        setProgress(Math.round((i / totalChunks) * 90));

        const start = i * CHUNK_BYTES;
        const end = Math.min(start + CHUNK_BYTES, arrayBuffer.byteLength);
        const chunk = arrayBuffer.slice(start, end);

        const ext = file.name.includes(".") ? file.name : `${file.name}.m4a`;
        const { lines, plain } = await sendChunk(chunk, ext, whisperLang, controller.signal);

        // Нормализуем индексы спикеров — смещаем relative to предыдущего чанка
        const normalized = lines.map((l) => ({
          ...l,
          speaker: (l.speaker + speakerOffset) % 4,
        }));

        if (lines.length > 0) {
          speakerOffset = (normalized[normalized.length - 1].speaker + 1) % 4;
        }

        allLines.push(...normalized);
        if (plain.trim()) allPlainParts.push(plain.trim());
      }

      setProgress(100);
      setChunkInfo(null);

      const finalPlain = allPlainParts.join(" ");
      setResultLines(allLines);
      setResultPlain(finalPlain);
      setStatus("done");
      onResult(allLines, finalPlain);

    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка");
      setStatus("error");
    }
  }, [whisperLang, onResult]);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); if (inputRef.current) inputRef.current.value = ""; };

  const formatSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} МБ` : `${Math.round(b / 1024)} КБ`;

  return (
    <div className="space-y-4">

      {status === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="relative rounded-2xl border-2 border-dashed border-border hover:border-neon-purple/50 hover:bg-neon-purple/5 cursor-pointer transition-all duration-300 p-8 text-center"
        >
          <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleChange} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center">
              <Icon name="FileAudio" size={28} className="text-neon-purple" />
            </div>
            <div>
              <p className="font-body font-semibold text-foreground">Загрузите аудиофайл</p>
              <p className="text-muted-foreground text-sm font-body mt-1">MP3, WAV, OGG, M4A, WEBM · до {MAX_FILE_MB} МБ</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
              <Icon name="Sparkles" size={12} className="text-neon-purple" />
              <span className="text-xs font-body text-neon-purple font-semibold">OpenAI Whisper · точное распознавание</span>
            </div>
          </div>
        </div>
      )}

      {status === "uploading" && (
        <div className="rounded-2xl border-2 border-neon-purple/40 bg-neon-purple/5 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center flex-shrink-0">
              <Icon name="FileAudio" size={18} className="text-neon-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-foreground text-sm truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground font-body">{formatSize(fileSize)}</p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-xs font-body text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Icon name="Sparkles" size={11} className="text-neon-purple" />
                {chunkInfo && chunkInfo.total > 1
                  ? `Часть ${chunkInfo.current} из ${chunkInfo.total} — Whisper распознаёт...`
                  : progress < 20 ? "Загружаю файл..." : progress < 50 ? "Отправляю в Whisper..." : progress < 90 ? "Whisper распознаёт речь..." : "Финализирую..."}
              </span>
              <span className="text-neon-purple font-semibold">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-purple to-neon-orange rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground font-body underline">
            Отменить
          </button>
        </div>
      )}

      {status === "done" && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
          <Icon name="CheckCircle" size={20} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-foreground text-sm truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground font-body">
              {resultLines.length > 0 ? `${resultLines.length} реплик` : `${resultPlain.split(/\s+/).filter(Boolean).length} слов`} · Whisper
            </p>
          </div>
          <button onClick={resetAll} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <Icon name="X" size={16} />
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 flex flex-col items-center gap-3 text-center">
          <Icon name="AlertCircle" size={28} className="text-red-400" />
          <div>
            <p className="font-body font-semibold text-foreground mb-1">Ошибка распознавания</p>
            <p className="text-xs text-muted-foreground font-body">{errorMsg || "Попробуйте ещё раз или проверьте ключ OpenAI."}</p>
          </div>
          <button onClick={resetAll} className="px-4 py-2 rounded-xl border border-border bg-muted text-sm font-body text-foreground hover:border-neon-orange/40 transition-all">
            Попробовать снова
          </button>
        </div>
      )}

      {status === "done" && (resultLines.length > 0 || resultPlain) && (
        <TranscriptSavePanel lines={resultLines} plain={resultPlain} fileName={fileName} />
      )}
    </div>
  );
}

// ─── Re-exports для HeroSection ───────────────────────────────────────────────
export { WaveVisualizer, MicButton } from "./MicControls";
export { ExportPanel, SpeakerView } from "./TranscriptPanel";
export type { SpeechRecognitionInstance };
