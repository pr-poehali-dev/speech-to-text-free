import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpeechRecognitionInstance {
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

export interface SpeakerLine {
  speaker: number;
  text: string;
  time: string;
}

export interface VoiceProfile {
  centroid: number;
  pitch: number;
  samples: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SPEAKER_COLORS = [
  { label: "Спикер 1", accent: "text-neon-orange", bg: "bg-neon-orange/10", border: "border-neon-orange/30", dot: "#FF6B1A" },
  { label: "Спикер 2", accent: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/30", dot: "#9B5CF6" },
  { label: "Спикер 3", accent: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30", dot: "#22D3EE" },
  { label: "Спикер 4", accent: "text-neon-pink", bg: "bg-neon-pink/10", border: "border-neon-pink/30", dot: "#EC4899" },
];

export const LANG_OPTIONS = [
  { code: "ru-RU", label: "RU 🇷🇺" },
  { code: "en-US", label: "EN 🇺🇸" },
  { code: "de-DE", label: "DE 🇩🇪" },
  { code: "fr-FR", label: "FR 🇫🇷" },
  { code: "es-ES", label: "ES 🇪🇸" },
  { code: "zh-CN", label: "CN 🇨🇳" },
];

export const NAV_LINKS = [
  { href: "#hero", label: "Главная" },
  { href: "#how", label: "Как работает" },
  { href: "#features", label: "Возможности" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Контакты" },
];

export const HOW_STEPS = [
  { num: "01", icon: "Mic", title: "Нажмите и говорите", desc: "Нажмите кнопку записи и начните говорить — микрофон активируется мгновенно.", color: "text-neon-orange", bg: "bg-neon-orange/10", border: "border-neon-orange/30" },
  { num: "02", icon: "Waves", title: "ИИ распознаёт речь", desc: "Алгоритм анализирует аудио в реальном времени и преобразует звук в текст.", color: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/30" },
  { num: "03", icon: "FileText", title: "Редактируйте и скачивайте", desc: "Правьте текст в редакторе, сохраняйте историю и экспортируйте в нужный формат.", color: "text-neon-pink", bg: "bg-neon-pink/10", border: "border-neon-pink/30" },
];

export const FEATURES = [
  { icon: "Download", title: "Экспорт в TXT, DOCX, PDF", desc: "Скачивайте готовый текст в любом удобном формате одним кликом.", color: "text-neon-orange", bg: "bg-neon-orange/10" },
  { icon: "History", title: "История записей", desc: "Все распознанные тексты сохраняются и доступны в любое время.", color: "text-neon-purple", bg: "bg-neon-purple/10" },
  { icon: "PenLine", title: "Встроенный редактор", desc: "Правьте текст сразу после распознавания — без копирования в другие приложения.", color: "text-neon-pink", bg: "bg-neon-pink/10" },
  { icon: "Globe", title: "Несколько языков", desc: "Поддержка русского, английского, немецкого, французского и других языков.", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  { icon: "Users", title: "Несколько спикеров", desc: "Автоматическое разделение речи по спикерам с метками времени.", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { icon: "FileAudio", title: "Загрузка аудиофайла", desc: "Загрузите MP3, WAV или OGG — сервис сам преобразует запись в текст.", color: "text-green-400", bg: "bg-green-400/10" },
];

export const FAQS = [
  { q: "Это действительно бесплатно?", a: "Да, сервис полностью бесплатный. Никаких скрытых платежей, подписок или лимитов." },
  { q: "Какие языки поддерживаются?", a: "Русский, английский, немецкий, французский, испанский, итальянский, китайский и другие." },
  { q: "Нужно ли устанавливать программу?", a: "Нет, сервис работает прямо в браузере. Никаких загрузок и установок." },
  { q: "Как работает автоматическое определение спикеров?", a: "Сервис анализирует тембр и частоту голоса через Web Audio API в реальном времени. Каждый новый уникальный голос получает свой цвет и метку. До 4 спикеров одновременно — всё происходит автоматически, без ручной настройки." },
  { q: "Какие форматы файлов можно загружать?", a: "MP3, WAV, OGG, WEBM, M4A — любые аудиоформаты, которые поддерживает ваш браузер." },
  { q: "Как экспортировать текст?", a: "Нажмите кнопку «Экспорт» и выберите формат: TXT, DOCX или PDF. Файл скачается автоматически." },
];

export const LANGUAGES = ["Русский 🇷🇺", "English 🇺🇸", "Deutsch 🇩🇪", "Français 🇫🇷", "Español 🇪🇸", "中文 🇨🇳"];

// ─── Voice fingerprint helpers ────────────────────────────────────────────────

export function getSpectralCentroid(freqData: Uint8Array, sampleRate: number): number {
  let weightedSum = 0;
  let totalMag = 0;
  const binWidth = sampleRate / (freqData.length * 2);
  for (let i = 1; i < freqData.length; i++) {
    const mag = freqData[i];
    weightedSum += mag * i * binWidth;
    totalMag += mag;
  }
  return totalMag > 0 ? weightedSum / totalMag : 0;
}

export function getDominantPitch(freqData: Uint8Array, sampleRate: number): number {
  let maxMag = 0;
  let maxIdx = 0;
  const binWidth = sampleRate / (freqData.length * 2);
  const minBin = Math.floor(80 / binWidth);
  const maxBin = Math.floor(400 / binWidth);
  for (let i = minBin; i < Math.min(maxBin, freqData.length); i++) {
    if (freqData[i] > maxMag) { maxMag = freqData[i]; maxIdx = i; }
  }
  return maxIdx * binWidth;
}

export function voiceDistance(a: VoiceProfile, b: VoiceProfile): number {
  const dc = Math.abs(a.centroid - b.centroid) / 1000;
  const dp = Math.abs(a.pitch - b.pitch) / 200;
  return dc * 0.6 + dp * 0.4;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

export function now(): string {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function speakerLinesToText(lines: SpeakerLine[]): string {
  return lines.map((l) => `[${SPEAKER_COLORS[l.speaker]?.label ?? "Спикер"} ${l.time}]\n${l.text}`).join("\n\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportDocx(lines: SpeakerLine[], plain: string) {
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

export function exportPdf(lines: SpeakerLine[], plain: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const addText = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const pdfLines = doc.splitTextToSize(text, pageW);
    pdfLines.forEach((line: string) => {
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
