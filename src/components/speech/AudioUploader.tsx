import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  SpeakerLine,
  SpeechRecognitionInstance,
  SPEAKER_COLORS,
  now,
  speakerLinesToText,
  downloadBlob,
  exportDocx,
  exportPdf,
} from "./types";

// ─── Wave Visualizer ──────────────────────────────────────────────────────────

export function WaveVisualizer({ active, color = "bg-neon-orange" }: { active: boolean; color?: string }) {
  const bars = [4, 7, 3, 9, 5, 12, 6, 10, 4, 8, 3, 11, 5];
  return (
    <div className="flex items-center gap-1 h-8">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${active ? `${color} wave-bar` : "bg-muted"}`}
          style={{ width: 3, height: active ? undefined : 6, animationDelay: `${i * 0.09}s`, minHeight: 3 }}
        />
      ))}
    </div>
  );
}

// ─── Mic Button ───────────────────────────────────────────────────────────────

export function MicButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-neon-orange/20 animate-pulse-ring-2" />
          <span className="absolute inset-0 rounded-full bg-neon-orange/30 animate-pulse-ring" />
        </>
      )}
      <button
        onClick={onClick}
        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 text-white ${
          isRecording
            ? "bg-gradient-to-br from-neon-orange to-red-500 shadow-[0_0_40px_rgba(255,107,26,0.7)] scale-110"
            : "bg-gradient-to-br from-neon-orange to-neon-purple hover:shadow-[0_0_40px_rgba(155,92,246,0.5)] hover:scale-105"
        }`}
        aria-label={isRecording ? "Остановить запись" : "Начать запись"}
      >
        <Icon name={isRecording ? "MicOff" : "Mic"} size={32} />
      </button>
    </div>
  );
}

// ─── Export Panel ─────────────────────────────────────────────────────────────

export function ExportPanel({ lines, plain }: { lines: SpeakerLine[]; plain: string }) {
  const disabled = !plain && lines.length === 0;

  const handleTxt = () => {
    const text = lines.length > 0 ? speakerLinesToText(lines) : plain;
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), "voicetext.txt");
  };
  const handleDocx = () => exportDocx(lines, plain);
  const handleDoc = () => exportDocx(lines, plain);
  const handlePdf = () => exportPdf(lines, plain);

  const btns = [
    { label: "TXT", icon: "FileText", action: handleTxt },
    { label: "DOC", icon: "FileType", action: handleDoc },
    { label: "DOCX", icon: "FileType2", action: handleDocx },
    { label: "PDF", icon: "FileImage", action: handlePdf },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {btns.map(({ label, icon, action }) => (
        <button
          key={label}
          onClick={action}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted hover:border-neon-orange/50 hover:bg-neon-orange/10 text-sm font-body text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name={icon} size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Transcript Save Panel ────────────────────────────────────────────────────

export function TranscriptSavePanel({ lines, plain, fileName }: { lines: SpeakerLine[]; plain: string; fileName: string }) {
  const [editedLines, setEditedLines] = useState<SpeakerLine[]>(lines);
  const [editedPlain, setEditedPlain] = useState(plain);
  const [viewMode, setViewMode] = useState<"speakers" | "plain">(lines.length > 0 ? "speakers" : "plain");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const wordCount = (viewMode === "plain" ? editedPlain : editedLines.map(l => l.text).join(" "))
    .trim().split(/\s+/).filter(Boolean).length;
  const charCount = (viewMode === "plain" ? editedPlain : editedLines.map(l => l.text).join(" ")).length;

  const getExportLines = () => editedLines.length > 0 ? editedLines : [];
  const getExportPlain = () => viewMode === "plain" ? editedPlain : editedLines.map(l => l.text).join(" ");

  const copyAll = () => {
    const text = editedLines.length > 0 && viewMode === "speakers"
      ? speakerLinesToText(editedLines)
      : editedPlain;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseName = fileName.replace(/\.[^.]+$/, "") || "transcript";

  return (
    <div className="rounded-2xl border border-green-500/30 bg-green-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Icon name="FileCheck" size={20} className="text-green-400 flex-shrink-0" />
        <div>
          <span className="font-display font-bold text-foreground">Транскрипт готов</span>
          <p className="text-xs text-muted-foreground font-body mt-0.5">{baseName} · {wordCount} слов · {charCount} символов</p>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {lines.length > 0 && (
            <>
              <button
                onClick={() => setViewMode("speakers")}
                className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all ${viewMode === "speakers" ? "bg-neon-purple text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                По спикерам
              </button>
              <button
                onClick={() => setViewMode("plain")}
                className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all ${viewMode === "plain" ? "bg-neon-orange text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                Сплошной
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="mx-5 mb-4 rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <span className="text-xs text-muted-foreground font-body">Предпросмотр · двойной клик — редактировать</span>
          <button
            onClick={copyAll}
            className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name={copied ? "Check" : "Copy"} size={12} className={copied ? "text-green-400" : ""} />
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-72 overflow-y-auto p-4">
          {viewMode === "speakers" && editedLines.length > 0 ? (
            <div className="space-y-3">
              {editedLines.map((line, i) => {
                const sp = SPEAKER_COLORS[line.speaker] ?? SPEAKER_COLORS[0];
                return (
                  <div key={i} className={`rounded-xl border ${sp.border} ${sp.bg} px-4 py-3 flex gap-3 items-start group`}>
                    <div className="flex-shrink-0">
                      <div className={`text-xs font-display font-bold ${sp.accent}`}>{sp.label}</div>
                      <div className="text-muted-foreground text-xs font-body">{line.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingIdx === i ? (
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onBlur={() => {
                            setEditedLines(prev => prev.map((l, idx) => idx === i ? { ...l, text: draft } : l));
                            setEditingIdx(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              setEditedLines(prev => prev.map((l, idx) => idx === i ? { ...l, text: draft } : l));
                              setEditingIdx(null);
                            }
                            if (e.key === "Escape") setEditingIdx(null);
                          }}
                          className="w-full bg-transparent text-foreground font-body text-sm resize-none focus:outline-none leading-relaxed"
                          rows={2}
                        />
                      ) : (
                        <p
                          className="text-foreground font-body text-sm leading-relaxed cursor-text"
                          onDoubleClick={() => { setEditingIdx(i); setDraft(line.text); }}
                        >
                          {line.text}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingIdx(i); setDraft(line.text); }}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="Pencil" size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <textarea
              value={editedPlain}
              onChange={e => setEditedPlain(e.target.value)}
              className="w-full min-h-[140px] bg-transparent text-foreground font-body text-sm resize-none focus:outline-none leading-relaxed placeholder:text-muted-foreground"
              placeholder="Текст транскрипта..."
            />
          )}
        </div>
      </div>

      {/* Save buttons */}
      <div className="px-5 pb-5">
        <p className="text-xs text-muted-foreground font-body mb-3">Сохранить в формате:</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "TXT",
              icon: "FileText",
              desc: "Текст",
              color: "hover:border-slate-400/60 hover:bg-slate-400/10",
              action: () => downloadBlob(
                new Blob([editedLines.length > 0 && viewMode === "speakers" ? speakerLinesToText(editedLines) : editedPlain], { type: "text/plain;charset=utf-8" }),
                `${baseName}.txt`
              ),
            },
            {
              label: "DOC",
              icon: "FileType",
              desc: "Word 97",
              color: "hover:border-blue-400/60 hover:bg-blue-400/10",
              action: () => exportDocx(getExportLines(), getExportPlain()),
            },
            {
              label: "DOCX",
              icon: "FileType2",
              desc: "Word",
              color: "hover:border-blue-500/60 hover:bg-blue-500/10",
              action: () => exportDocx(getExportLines(), getExportPlain()),
            },
            {
              label: "PDF",
              icon: "FileImage",
              desc: "PDF",
              color: "hover:border-red-400/60 hover:bg-red-400/10",
              action: () => exportPdf(getExportLines(), getExportPlain()),
            },
          ].map(({ label, icon, desc, color, action }) => (
            <button
              key={label}
              onClick={action}
              className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-border bg-card ${color} transition-all group`}
            >
              <Icon name={icon} size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs font-display font-bold text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground font-body">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Speaker Lines Viewer ─────────────────────────────────────────────────────

export function SpeakerView({ lines, onEdit }: { lines: SpeakerLine[]; onEdit: (idx: number, text: string) => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (lines.length === 0) return null;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
      {lines.map((l, i) => {
        const sp = SPEAKER_COLORS[l.speaker] ?? SPEAKER_COLORS[0];
        return (
          <div key={i} className={`rounded-xl border ${sp.border} ${sp.bg} px-4 py-3 flex gap-3 items-start`}>
            <div className="flex-shrink-0 mt-0.5">
              <span className={`font-display text-xs font-bold ${sp.accent}`}>{sp.label}</span>
              <div className="text-muted-foreground text-xs font-body">{l.time}</div>
            </div>
            <div className="flex-1 min-w-0">
              {editing === i ? (
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => { onEdit(i, draft); setEditing(null); }}
                  className="w-full bg-transparent text-foreground font-body text-sm resize-none focus:outline-none leading-relaxed"
                  rows={2}
                />
              ) : (
                <p
                  className="text-foreground font-body text-sm leading-relaxed cursor-text"
                  onDoubleClick={() => { setEditing(i); setDraft(l.text); }}
                  title="Двойной клик — редактировать"
                >
                  {l.text}
                </p>
              )}
            </div>
            <button onClick={() => { setEditing(i); setDraft(l.text); }} className="flex-shrink-0 text-muted-foreground hover:text-foreground mt-0.5">
              <Icon name="Pencil" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Audio Uploader ───────────────────────────────────────────────────────────

const WHISPER_URL = "https://functions.poehali.dev/2c9ac17b-b681-4f85-9399-c68876c7bef7";
const MAX_FILE_MB = 150;

export function AudioUploader({ lang, onResult }: { lang: string; onResult: (lines: SpeakerLine[], plain: string) => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [resultLines, setResultLines] = useState<SpeakerLine[]>([]);
  const [resultPlain, setResultPlain] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAll = () => {
    abortRef.current?.abort();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setStatus("idle");
    setFileName("");
    setFileSize(0);
    setProgress(0);
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
    setResultLines([]);
    setResultPlain("");

    let fakeProgress = 0;
    progressTimerRef.current = setInterval(() => {
      fakeProgress += fakeProgress < 60 ? 3 : fakeProgress < 85 ? 1 : 0.3;
      setProgress(Math.min(92, Math.round(fakeProgress)));
    }, 400);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);

      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(WHISPER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: b64, language: whisperLang, fileName: file.name }),
        signal: controller.signal,
      });

      if (progressTimerRef.current) clearInterval(progressTimerRef.current);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `Ошибка сервера ${resp.status}`);
      }

      const data = await resp.json();
      setProgress(100);

      const lines: SpeakerLine[] = (data.lines ?? []).map((l: { speaker: number; text: string; time: string }) => ({
        speaker: l.speaker,
        text: l.text,
        time: l.time,
      }));
      const plain: string = data.plain ?? "";

      setResultLines(lines);
      setResultPlain(plain);
      setStatus("done");
      onResult(lines, plain);

    } catch (e: unknown) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
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
                {progress < 20 ? "Загружаю файл..." : progress < 50 ? "Отправляю в Whisper..." : progress < 90 ? "Whisper распознаёт речь..." : "Финализирую..."}
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

// ─── Re-export SpeechRecognitionInstance for HeroSection ─────────────────────
export type { SpeechRecognitionInstance };