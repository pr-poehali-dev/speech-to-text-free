import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeakerLine {
  speaker: number;
  text: string;
  time: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SPEAKER_COLORS = [
  { label: "Спикер 1", accent: "text-neon-orange", bg: "bg-neon-orange/10", border: "border-neon-orange/30", dot: "#FF6B1A" },
  { label: "Спикер 2", accent: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/30", dot: "#9B5CF6" },
  { label: "Спикер 3", accent: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30", dot: "#22D3EE" },
  { label: "Спикер 4", accent: "text-neon-pink", bg: "bg-neon-pink/10", border: "border-neon-pink/30", dot: "#EC4899" },
];

const LANG_OPTIONS = [
  { code: "ru-RU", label: "RU 🇷🇺" },
  { code: "en-US", label: "EN 🇺🇸" },
  { code: "de-DE", label: "DE 🇩🇪" },
  { code: "fr-FR", label: "FR 🇫🇷" },
  { code: "es-ES", label: "ES 🇪🇸" },
  { code: "zh-CN", label: "CN 🇨🇳" },
];

const NAV_LINKS = [
  { href: "#hero", label: "Главная" },
  { href: "#how", label: "Как работает" },
  { href: "#features", label: "Возможности" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Контакты" },
];

const HOW_STEPS = [
  { num: "01", icon: "Mic", title: "Нажмите и говорите", desc: "Нажмите кнопку записи и начните говорить — микрофон активируется мгновенно.", color: "text-neon-orange", bg: "bg-neon-orange/10", border: "border-neon-orange/30" },
  { num: "02", icon: "Waves", title: "ИИ распознаёт речь", desc: "Алгоритм анализирует аудио в реальном времени и преобразует звук в текст.", color: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/30" },
  { num: "03", icon: "FileText", title: "Редактируйте и скачивайте", desc: "Правьте текст в редакторе, сохраняйте историю и экспортируйте в нужный формат.", color: "text-neon-pink", bg: "bg-neon-pink/10", border: "border-neon-pink/30" },
];

const FEATURES = [
  { icon: "Download", title: "Экспорт в TXT, DOCX, PDF", desc: "Скачивайте готовый текст в любом удобном формате одним кликом.", color: "text-neon-orange", bg: "bg-neon-orange/10" },
  { icon: "History", title: "История записей", desc: "Все распознанные тексты сохраняются и доступны в любое время.", color: "text-neon-purple", bg: "bg-neon-purple/10" },
  { icon: "PenLine", title: "Встроенный редактор", desc: "Правьте текст сразу после распознавания — без копирования в другие приложения.", color: "text-neon-pink", bg: "bg-neon-pink/10" },
  { icon: "Globe", title: "Несколько языков", desc: "Поддержка русского, английского, немецкого, французского и других языков.", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  { icon: "Users", title: "Несколько спикеров", desc: "Автоматическое разделение речи по спикерам с метками времени.", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { icon: "FileAudio", title: "Загрузка аудиофайла", desc: "Загрузите MP3, WAV или OGG — сервис сам преобразует запись в текст.", color: "text-green-400", bg: "bg-green-400/10" },
];

const FAQS = [
  { q: "Это действительно бесплатно?", a: "Да, сервис полностью бесплатный. Никаких скрытых платежей, подписок или лимитов." },
  { q: "Какие языки поддерживаются?", a: "Русский, английский, немецкий, французский, испанский, итальянский, китайский и другие." },
  { q: "Нужно ли устанавливать программу?", a: "Нет, сервис работает прямо в браузере. Никаких загрузок и установок." },
  { q: "Как работает распознавание нескольких голосов?", a: "При записи через микрофон сервис отслеживает паузы между репликами. Вы можете вручную указать смену спикера или переключать кнопки спикеров. Каждая реплика помечается меткой и цветом." },
  { q: "Какие форматы файлов можно загружать?", a: "MP3, WAV, OGG, WEBM, M4A — любые аудиоформаты, которые поддерживает ваш браузер." },
  { q: "Как экспортировать текст?", a: "Нажмите кнопку «Экспорт» и выберите формат: TXT, DOCX или PDF. Файл скачается автоматически." },
];

const LANGUAGES = ["Русский 🇷🇺", "English 🇺🇸", "Deutsch 🇩🇪", "Français 🇫🇷", "Español 🇪🇸", "中文 🇨🇳"];

// ─── Utils ───────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function speakerLinesToText(lines: SpeakerLine[]): string {
  return lines.map((l) => `[${SPEAKER_COLORS[l.speaker]?.label ?? "Спикер"} ${l.time}]\n${l.text}`).join("\n\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportDocx(lines: SpeakerLine[], plain: string) {
  const children = lines.length > 0
    ? lines.flatMap((l) => {
        const sp = SPEAKER_COLORS[l.speaker]?.label ?? "Спикер";
        return [
          new Paragraph({ children: [new TextRun({ text: `${sp} · ${l.time}`, bold: true, size: 22 })], heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ children: [new TextRun({ text: l.text, size: 24 })] }),
          new Paragraph({}),
        ];
      })
    : [new Paragraph({ children: [new TextRun({ text: plain, size: 24 })] })];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: "VoiceText — расшифровка", bold: true, size: 32 })], heading: HeadingLevel.HEADING_1 }),
        new Paragraph({}),
        ...children,
      ],
    }],
  });
  const buf = await Packer.toBlob(doc);
  downloadBlob(buf, "voicetext.docx");
}

function exportPdf(lines: SpeakerLine[], plain: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const addText = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, pageW);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size * 0.5;
    });
    y += 3;
  };

  addText("VoiceText — расшифровка", 18, true);
  y += 4;

  if (lines.length > 0) {
    lines.forEach((l) => {
      const sp = SPEAKER_COLORS[l.speaker]?.label ?? "Спикер";
      addText(`${sp} · ${l.time}`, 10, true);
      addText(l.text, 11);
      y += 2;
    });
  } else {
    addText(plain, 11);
  }

  doc.save("voicetext.pdf");
}

// ─── Wave Visualizer ─────────────────────────────────────────────────────────

function WaveVisualizer({ active, color = "bg-neon-orange" }: { active: boolean; color?: string }) {
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

// ─── Mic Button ──────────────────────────────────────────────────────────────

function MicButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
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

function ExportPanel({ lines, plain }: { lines: SpeakerLine[]; plain: string }) {
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

// ─── Audio File Uploader ──────────────────────────────────────────────────────

function AudioUploader({ lang, onResult }: { lang: string; onResult: (lines: SpeakerLine[], plain: string) => void }) {
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setStatus("processing");
    setProgress(0);

    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("error");
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioRef.current = audio;

    const lines: SpeakerLine[] = [];
    const plainParts: string[] = [];
    let speakerIdx = 0;
    let lastFinalTime = Date.now();
    const SPEAKER_PAUSE_MS = 2500;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          if (!text) continue;
          const currentTime = Date.now();
          if (currentTime - lastFinalTime > SPEAKER_PAUSE_MS && lines.length > 0) {
            speakerIdx = (speakerIdx + 1) % SPEAKER_COLORS.length;
          }
          lastFinalTime = currentTime;
          lines.push({ speaker: speakerIdx, text, time: now() });
          plainParts.push(text);
        }
      }
    };

    rec.onerror = () => { setStatus("error"); audio.pause(); URL.revokeObjectURL(url); };
    rec.onend = () => {
      setProgress(100);
      setStatus("done");
      onResult(lines, plainParts.join(" "));
      URL.revokeObjectURL(url);
    };

    recRef.current = rec;
    audio.play().catch(() => setStatus("error"));

    const dur = file.size / 16000;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return 95; }
        return p + 2;
      });
    }, (dur * 10) || 200);

    audio.onended = () => {
      clearInterval(interval);
      rec.stop();
    };

    rec.start();
  }, [lang, onResult]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const cancel = () => {
    recRef.current?.abort();
    audioRef.current?.pause();
    setStatus("idle");
    setProgress(0);
    setFileName("");
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-6 text-center ${
        status === "idle"
          ? "border-border hover:border-neon-purple/50 hover:bg-neon-purple/5 cursor-pointer"
          : status === "processing"
          ? "border-neon-orange/50 bg-neon-orange/5"
          : status === "done"
          ? "border-green-500/50 bg-green-500/5"
          : "border-red-500/50 bg-red-500/5"
      }`}
      onClick={() => status === "idle" && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleChange} />

      {status === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center">
            <Icon name="FileAudio" size={24} className="text-neon-purple" />
          </div>
          <div>
            <p className="font-body font-semibold text-foreground">Загрузите аудиофайл</p>
            <p className="text-muted-foreground text-sm font-body mt-1">MP3, WAV, OGG, M4A, WEBM — перетащите или нажмите</p>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className="flex flex-col items-center gap-4">
          <WaveVisualizer active color="bg-neon-orange" />
          <div className="w-full">
            <div className="flex justify-between text-sm font-body text-muted-foreground mb-2">
              <span>Обрабатываю: <span className="text-foreground">{fileName}</span></span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-orange to-neon-purple rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); cancel(); }} className="text-sm text-muted-foreground hover:text-foreground font-body underline">
            Отменить
          </button>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center justify-center gap-3">
          <Icon name="CheckCircle" size={24} className="text-green-400" />
          <span className="font-body text-foreground">{fileName} — обработан</span>
          <button onClick={(e) => { e.stopPropagation(); setStatus("idle"); setFileName(""); setProgress(0); }} className="text-sm text-muted-foreground hover:text-neon-orange font-body underline ml-2">
            Загрузить другой
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-center gap-3">
          <Icon name="AlertCircle" size={24} className="text-red-400" />
          <span className="font-body text-red-400">Ошибка. Попробуйте Chrome или Edge с включённым микрофоном.</span>
          <button onClick={(e) => { e.stopPropagation(); setStatus("idle"); }} className="text-sm underline text-muted-foreground hover:text-foreground font-body ml-2">
            Повторить
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Speaker Lines Viewer ─────────────────────────────────────────────────────

function SpeakerView({ lines, onEdit }: { lines: SpeakerLine[]; onEdit: (idx: number, text: string) => void }) {
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

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const [mode, setMode] = useState<"mic" | "file">("mic");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speakerLines, setSpeakerLines] = useState<SpeakerLine[]>([]);
  const [plainText, setPlainText] = useState("");
  const [lang, setLang] = useState("ru-RU");
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [speakerCount, setSpeakerCount] = useState(1);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastFinalTimeRef = useRef(Date.now());
  const SPEAKER_PAUSE_MS = 2800;

  const startRecording = () => {
    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { alert("Ваш браузер не поддерживает распознавание. Используйте Chrome или Edge."); return; }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const curr = Date.now();
          const gap = curr - lastFinalTimeRef.current;
          lastFinalTimeRef.current = curr;

          let speaker = activeSpeaker;
          if (speakerCount > 1 && gap > SPEAKER_PAUSE_MS) {
            speaker = (activeSpeaker + 1) % speakerCount;
            setActiveSpeaker(speaker);
          }

          setSpeakerLines((prev) => [...prev, { speaker, text: t.trim(), time: now() }]);
          setPlainText((prev) => (prev ? prev + " " + t.trim() : t.trim()));
          setTranscript("");
        } else {
          interim += t;
        }
      }
      if (interim) setTranscript(interim);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => { setIsRecording(false); setTranscript(""); };
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  const stopRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); setTranscript(""); };
  const handleMic = () => { if (isRecording) stopRecording(); else startRecording(); };

  const handleFileResult = (lines: SpeakerLine[], plain: string) => {
    setSpeakerLines(lines);
    setPlainText(plain);
  };

  const editLine = (idx: number, text: string) => {
    setSpeakerLines((prev) => prev.map((l, i) => i === idx ? { ...l, text } : l));
  };

  const clearAll = () => { setSpeakerLines([]); setPlainText(""); setTranscript(""); };
  const copyText = () => { const t = speakerLines.length > 0 ? speakerLinesToText(speakerLines) : plainText; if (t) navigator.clipboard.writeText(t); };

  const hasContent = speakerLines.length > 0 || plainText.length > 0;

  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center px-4 py-24 mesh-bg overflow-hidden">
      <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-neon-purple/8 blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-20 left-[5%] w-56 h-56 rounded-full bg-neon-orange/8 blur-3xl pointer-events-none" />

      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-orange/30 bg-neon-orange/10 text-neon-orange text-sm font-body mb-5">
          <span className="w-2 h-2 rounded-full bg-neon-orange animate-pulse inline-block" />
          Бесплатно · Без регистрации · Прямо в браузере
        </div>
        <h1 className="font-display text-6xl md:text-8xl font-bold leading-none mb-4">
          <span className="text-foreground">ГОЛОС</span>
          <br />
          <span className="gradient-text text-glow-orange">В ТЕКСТ</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto font-body leading-relaxed">
          Говорите или загрузите аудио — сервис мгновенно преобразует речь в текст.<br />
          Мульти-спикер, экспорт DOC/DOCX/PDF, редактор.
        </p>
      </div>

      <div className="w-full max-w-2xl animate-fade-up delay-200">
        {/* Mode tabs */}
        <div className="flex rounded-xl border border-border bg-card p-1 mb-4">
          <button
            onClick={() => setMode("mic")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-semibold transition-all ${mode === "mic" ? "bg-neon-orange text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="Mic" size={16} />
            Микрофон
          </button>
          <button
            onClick={() => setMode("file")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-semibold transition-all ${mode === "file" ? "bg-neon-purple text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="FileAudio" size={16} />
            Загрузить файл
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />

          {/* Mic mode */}
          {mode === "mic" && (
            <>
              {/* Speaker controls */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm font-body">Спикеров:</span>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setSpeakerCount(n); if (activeSpeaker >= n) setActiveSpeaker(0); }}
                      className={`w-7 h-7 rounded-lg text-xs font-display font-bold transition-all ${speakerCount === n ? "bg-neon-orange text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {speakerCount > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs font-body">Активный:</span>
                    {Array.from({ length: speakerCount }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSpeaker(i)}
                        className={`px-3 py-1 rounded-lg text-xs font-display font-bold transition-all border ${
                          activeSpeaker === i
                            ? `${SPEAKER_COLORS[i].bg} ${SPEAKER_COLORS[i].border} ${SPEAKER_COLORS[i].accent}`
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        {SPEAKER_COLORS[i]?.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <WaveVisualizer active={isRecording} />
                  {isRecording && <span className="text-neon-orange text-xs font-body animate-pulse">Запись...</span>}
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground font-body focus:outline-none focus:border-neon-orange/50"
                  >
                    {LANG_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Speaker lines or textarea */}
              {speakerLines.length > 0 ? (
                <div className="mb-4">
                  <SpeakerView lines={speakerLines} onEdit={editLine} />
                  {transcript && (
                    <div className={`mt-2 px-4 py-2 rounded-xl border ${SPEAKER_COLORS[activeSpeaker]?.border} ${SPEAKER_COLORS[activeSpeaker]?.bg} text-sm font-body text-muted-foreground italic`}>
                      {SPEAKER_COLORS[activeSpeaker]?.label}: {transcript}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative min-h-[100px] bg-muted rounded-xl p-4 mb-4 border border-border">
                  <textarea
                    value={plainText + (transcript ? (plainText ? " " : "") + transcript : "")}
                    onChange={(e) => setPlainText(e.target.value)}
                    placeholder="Ваш текст появится здесь... Нажмите кнопку микрофона и начните говорить."
                    className="w-full min-h-[80px] bg-transparent text-foreground font-body text-sm resize-none focus:outline-none placeholder:text-muted-foreground leading-relaxed"
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <MicButton isRecording={isRecording} onClick={handleMic} />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={copyText} disabled={!hasContent} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted hover:border-neon-purple/50 hover:bg-neon-purple/10 text-sm font-body text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      <Icon name="Copy" size={14} />Копировать
                    </button>
                    <button onClick={clearAll} disabled={!hasContent} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted hover:border-red-500/50 hover:bg-red-500/10 text-sm font-body text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      <Icon name="Trash2" size={14} />Очистить
                    </button>
                  </div>
                  <ExportPanel lines={speakerLines} plain={plainText} />
                </div>
              </div>
            </>
          )}

          {/* File mode */}
          {mode === "file" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground font-body focus:outline-none focus:border-neon-orange/50"
                >
                  {LANG_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <p className="text-muted-foreground text-xs font-body">Спикеры определяются по паузам в аудио</p>
              </div>

              <AudioUploader lang={lang} onResult={handleFileResult} />

              {speakerLines.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-body font-semibold text-foreground">{speakerLines.length} реплик распознано</span>
                    <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-red-400 font-body flex items-center gap-1">
                      <Icon name="Trash2" size={12} />Очистить
                    </button>
                  </div>
                  <SpeakerView lines={speakerLines} onEdit={editLine} />
                </div>
              )}

              {(speakerLines.length > 0 || plainText) && (
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 flex-wrap">
                  <button onClick={copyText} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted hover:border-neon-purple/50 hover:bg-neon-purple/10 text-sm font-body text-foreground transition-all">
                    <Icon name="Copy" size={14} />Копировать
                  </button>
                  <ExportPanel lines={speakerLines} plain={plainText} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-6 text-muted-foreground text-sm animate-fade-up delay-400">
        {["Chrome", "Edge", "Safari"].map((b) => (
          <span key={b} className="flex items-center gap-1.5">
            <Icon name="CheckCircle" size={14} className="text-green-400" />
            {b}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── How Section ─────────────────────────────────────────────────────────────

function HowSection() {
  return (
    <section id="how" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-neon-orange font-body text-sm uppercase tracking-widest">Просто и быстро</span>
          <h2 className="font-display text-5xl md:text-6xl font-bold text-foreground mt-3">
            КАК ЭТО <span className="gradient-text">РАБОТАЕТ</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_STEPS.map((step, i) => (
            <div key={i} className={`relative rounded-2xl border ${step.border} ${step.bg} p-8 card-hover`}>
              <div className={`font-display text-7xl font-bold opacity-10 absolute top-4 right-6 ${step.color}`}>{step.num}</div>
              <div className={`w-12 h-12 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-4`}>
                <Icon name={step.icon} size={24} className={step.color} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground font-body leading-relaxed text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-card/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-neon-purple font-body text-sm uppercase tracking-widest">Всё что нужно</span>
          <h2 className="font-display text-5xl md:text-6xl font-bold text-foreground mt-3">
            <span className="gradient-text">ВОЗМОЖНОСТИ</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 card-hover">
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                <Icon name={f.icon} size={20} className={f.color} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl border border-neon-orange/20 bg-gradient-to-br from-neon-orange/10 to-neon-purple/10 p-8 text-center">
          <div className="flex justify-center gap-3 flex-wrap mb-4">
            {LANGUAGES.map((l) => (
              <span key={l} className="px-4 py-2 rounded-full bg-muted border border-border text-foreground font-body text-sm">{l}</span>
            ))}
          </div>
          <p className="text-muted-foreground font-body text-sm">И ещё десятки языков — сервис распознаёт любую речь</p>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-neon-pink font-body text-sm uppercase tracking-widest">Ответы на вопросы</span>
          <h2 className="font-display text-5xl md:text-6xl font-bold text-foreground mt-3">FAQ</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${open === i ? "border-neon-orange/40 bg-neon-orange/5" : "border-border bg-card"}`}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                <span className="font-body font-semibold text-foreground">{faq.q}</span>
                <Icon name="ChevronDown" size={20} className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ml-4 ${open === i ? "rotate-180 text-neon-orange" : ""}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-muted-foreground font-body leading-relaxed text-sm">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact Section ──────────────────────────────────────────────────────────

function ContactSection() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  return (
    <section id="contact" className="py-24 px-4 bg-card/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-cyan-400 font-body text-sm uppercase tracking-widest">Свяжитесь с нами</span>
          <h2 className="font-display text-5xl md:text-6xl font-bold text-foreground mt-3">
            <span className="gradient-text">КОНТАКТЫ</span>
          </h2>
          <p className="text-muted-foreground font-body mt-4">Есть вопросы? Напишите нам — ответим в течение дня.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-10 text-center">
            <Icon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Сообщение отправлено!</h3>
            <p className="text-muted-foreground font-body">Мы ответим вам в ближайшее время.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="rounded-2xl border border-border bg-card p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">Ваше имя</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Иван Иванов"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">Email</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ivan@example.com"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">Сообщение</label>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Ваш вопрос или предложение..."
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors resize-none" />
            </div>
            <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-orange to-neon-purple text-white font-display font-semibold text-lg hover:shadow-[0_0_30px_rgba(255,107,26,0.4)] hover:scale-[1.02] transition-all duration-300">
              Отправить сообщение
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-md border-b border-border" : ""}`}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <a href="#hero" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-orange to-neon-purple flex items-center justify-center">
            <Icon name="Mic" size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Voice<span className="text-neon-orange">Text</span></span>
        </a>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-muted-foreground hover:text-neon-orange font-body text-sm transition-colors">{l.label}</a>
          ))}
        </div>
        <a href="#hero" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-orange text-white font-display font-semibold text-sm hover:bg-neon-orange/90 transition-all">
          <Icon name="Mic" size={14} />
          Начать бесплатно
        </a>
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-4 pb-4">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-3 text-muted-foreground hover:text-neon-orange font-body border-b border-border/50 last:border-0">{l.label}</a>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-orange to-neon-purple flex items-center justify-center">
            <Icon name="Mic" size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-foreground">Voice<span className="text-neon-orange">Text</span></span>
        </div>
        <p className="text-muted-foreground font-body text-sm">© 2026 VoiceText — бесплатный сервис распознавания речи</p>
        <div className="flex items-center gap-4 text-muted-foreground text-sm font-body">
          {NAV_LINKS.map((l) => <a key={l.href} href={l.href} className="hover:text-neon-orange transition-colors">{l.label}</a>)}
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <HowSection />
      <FeaturesSection />
      <FaqSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
