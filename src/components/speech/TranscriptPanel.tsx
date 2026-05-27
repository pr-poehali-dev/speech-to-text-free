import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  SpeakerLine,
  SPEAKER_COLORS,
  speakerLinesToText,
  downloadBlob,
  exportDocx,
  exportPdf,
} from "./types";

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
