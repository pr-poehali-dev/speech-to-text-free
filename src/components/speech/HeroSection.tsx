import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  SpeakerLine,
  SpeechRecognitionInstance,
  VoiceProfile,
  SPEAKER_COLORS,
  LANG_OPTIONS,
  now,
  speakerLinesToText,
  getSpectralCentroid,
  getDominantPitch,
  voiceDistance,
} from "./types";
import {
  WaveVisualizer,
  MicButton,
  ExportPanel,
  SpeakerView,
  AudioUploader,
} from "./AudioUploader";

const MATCH_THRESHOLD = 0.45;
const MIN_ENERGY = 12;

export default function HeroSection() {
  const [mode, setMode] = useState<"mic" | "file">("mic");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speakerLines, setSpeakerLines] = useState<SpeakerLine[]>([]);
  const [plainText, setPlainText] = useState("");
  const [lang, setLang] = useState("ru-RU");
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [detectedCount, setDetectedCount] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const profilesRef = useRef<VoiceProfile[]>([]);
  const freqSnapshotRef = useRef<{ centroid: number; pitch: number } | null>(null);
  const samplingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSpeakerRef = useRef(0);

  useEffect(() => { activeSpeakerRef.current = activeSpeaker; }, [activeSpeaker]);

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    samplingRef.current = setInterval(() => {
      analyser.getByteFrequencyData(freqData);
      const energy = freqData.reduce((s, v) => s + v, 0) / freqData.length;
      if (energy < MIN_ENERGY) { freqSnapshotRef.current = null; return; }
      const centroid = getSpectralCentroid(freqData, ctx.sampleRate);
      const pitch = getDominantPitch(freqData, ctx.sampleRate);
      freqSnapshotRef.current = { centroid, pitch };
    }, 80);
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (samplingRef.current) clearInterval(samplingRef.current);
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    freqSnapshotRef.current = null;
  }, []);

  const classifySpeaker = useCallback((): number => {
    const snap = freqSnapshotRef.current;
    if (!snap) return activeSpeakerRef.current;

    const profiles = profilesRef.current;
    const candidate: VoiceProfile = { centroid: snap.centroid, pitch: snap.pitch, samples: 1 };

    if (profiles.length === 0) {
      profilesRef.current = [candidate];
      setDetectedCount(1);
      return 0;
    }

    let bestIdx = -1;
    let bestDist = Infinity;
    profiles.forEach((p, i) => {
      const d = voiceDistance(p, candidate);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });

    if (bestDist < MATCH_THRESHOLD) {
      const p = profiles[bestIdx];
      const n = p.samples + 1;
      profilesRef.current[bestIdx] = {
        centroid: (p.centroid * p.samples + candidate.centroid) / n,
        pitch: (p.pitch * p.samples + candidate.pitch) / n,
        samples: n,
      };
      return bestIdx;
    }

    if (profiles.length < SPEAKER_COLORS.length) {
      profilesRef.current = [...profiles, candidate];
      const idx = profiles.length;
      setDetectedCount(idx + 1);
      return idx;
    }

    return bestIdx;
  }, []);

  const startRecording = useCallback(async () => {
    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { alert("Ваш браузер не поддерживает распознавание. Используйте Chrome или Edge."); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
      return;
    }
    streamRef.current = stream;
    startAudioAnalysis(stream);
    profilesRef.current = [];
    setDetectedCount(0);

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
          const speaker = classifySpeaker();
          setActiveSpeaker(speaker);
          setSpeakerLines((prev) => [...prev, { speaker, text: t.trim(), time: now() }]);
          setPlainText((prev) => (prev ? prev + " " + t.trim() : t.trim()));
          setTranscript("");
        } else {
          interim += t;
        }
      }
      if (interim) setTranscript(interim);
    };

    rec.onerror = () => { setIsRecording(false); stopAudioAnalysis(); };
    rec.onend = () => { setIsRecording(false); setTranscript(""); stopAudioAnalysis(); };
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, [lang, startAudioAnalysis, stopAudioAnalysis, classifySpeaker]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    stopAudioAnalysis();
    setIsRecording(false);
    setTranscript("");
  }, [stopAudioAnalysis]);

  const handleMic = () => { if (isRecording) stopRecording(); else startRecording(); };

  const handleFileResult = (lines: SpeakerLine[], plain: string) => {
    setSpeakerLines(lines);
    setPlainText(plain);
  };

  const editLine = (idx: number, text: string) => {
    setSpeakerLines((prev) => prev.map((l, i) => i === idx ? { ...l, text } : l));
  };

  const clearAll = () => {
    setSpeakerLines([]);
    setPlainText("");
    setTranscript("");
    profilesRef.current = [];
    setDetectedCount(0);
  };

  const copyText = () => {
    const t = speakerLines.length > 0 ? speakerLinesToText(speakerLines) : plainText;
    if (t) navigator.clipboard.writeText(t);
  };

  const hasContent = speakerLines.length > 0 || plainText.length > 0;
  const currentSp = SPEAKER_COLORS[activeSpeaker] ?? SPEAKER_COLORS[0];

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
          Авто-определение спикеров, экспорт DOC/DOCX/PDF, редактор.
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
              {/* Status bar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <WaveVisualizer active={isRecording} />
                  {isRecording && (
                    <div className="flex items-center gap-2">
                      <span className="text-neon-orange text-xs font-body animate-pulse">Запись...</span>
                      {detectedCount > 0 && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: detectedCount }, (_, i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all ${i === activeSpeaker ? "scale-125" : "opacity-40"}`}
                              style={{ backgroundColor: SPEAKER_COLORS[i]?.dot ?? "#888" }}
                            />
                          ))}
                          <span className="text-xs font-body text-muted-foreground ml-1">
                            {detectedCount === 1 ? "1 голос" : `${detectedCount} голоса`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border">
                    <Icon name="Brain" size={12} className="text-neon-purple" />
                    <span className="text-xs font-body text-muted-foreground">Авто-спикер</span>
                  </div>
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
                    <div className={`mt-2 px-4 py-2 rounded-xl border ${currentSp.border} ${currentSp.bg} text-sm font-body text-muted-foreground italic`}>
                      <span className={`font-semibold ${currentSp.accent}`}>{currentSp.label}:</span> {transcript}
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
                <div className="flex items-center gap-1.5">
                  <Icon name="Sparkles" size={12} className="text-neon-purple" />
                  <span className="text-muted-foreground text-xs font-body">OpenAI Whisper · авто-определение спикеров</span>
                </div>
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
