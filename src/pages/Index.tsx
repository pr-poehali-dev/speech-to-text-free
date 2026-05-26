import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const NAV_LINKS = [
  { href: "#hero", label: "Главная" },
  { href: "#how", label: "Как работает" },
  { href: "#features", label: "Возможности" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Контакты" },
];

const HOW_STEPS = [
  {
    num: "01",
    icon: "Mic",
    title: "Нажмите и говорите",
    desc: "Нажмите кнопку записи и начните говорить — микрофон активируется мгновенно.",
    color: "text-neon-orange",
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/30",
  },
  {
    num: "02",
    icon: "Waves",
    title: "ИИ распознаёт речь",
    desc: "Алгоритм анализирует аудио в реальном времени и преобразует звук в текст.",
    color: "text-neon-purple",
    bg: "bg-neon-purple/10",
    border: "border-neon-purple/30",
  },
  {
    num: "03",
    icon: "FileText",
    title: "Редактируйте и скачивайте",
    desc: "Правьте текст в редакторе, сохраняйте историю и экспортируйте в нужный формат.",
    color: "text-neon-pink",
    bg: "bg-neon-pink/10",
    border: "border-neon-pink/30",
  },
];

const FEATURES = [
  {
    icon: "Download",
    title: "Экспорт в TXT, DOCX, PDF",
    desc: "Скачивайте готовый текст в любом удобном формате одним кликом.",
    color: "text-neon-orange",
    bg: "bg-neon-orange/10",
  },
  {
    icon: "History",
    title: "История записей",
    desc: "Все распознанные тексты сохраняются и доступны в любое время.",
    color: "text-neon-purple",
    bg: "bg-neon-purple/10",
  },
  {
    icon: "PenLine",
    title: "Встроенный редактор",
    desc: "Правьте текст сразу после распознавания — без копирования в другие приложения.",
    color: "text-neon-pink",
    bg: "bg-neon-pink/10",
  },
  {
    icon: "Globe",
    title: "Несколько языков",
    desc: "Поддержка русского, английского, немецкого, французского и других языков.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: "Zap",
    title: "Мгновенное распознавание",
    desc: "Текст появляется в реальном времени пока вы говорите.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    icon: "Lock",
    title: "Полностью бесплатно",
    desc: "Никаких подписок, лимитов и скрытых платежей — бесплатно навсегда.",
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
];

const FAQS = [
  {
    q: "Это действительно бесплатно?",
    a: "Да, сервис полностью бесплатный. Никаких скрытых платежей, подписок или лимитов на использование.",
  },
  {
    q: "Какие языки поддерживаются?",
    a: "Поддерживаются русский, английский, немецкий, французский, испанский, итальянский, китайский и многие другие языки.",
  },
  {
    q: "Нужно ли устанавливать программу?",
    a: "Нет, сервис работает прямо в браузере. Просто откройте сайт и начните говорить — никаких загрузок и установок.",
  },
  {
    q: "Как долго хранится история записей?",
    a: "История хранится в вашем браузере без ограничений. Вы можете очистить её в любой момент.",
  },
  {
    q: "Как экспортировать текст в DOCX или PDF?",
    a: "После распознавания нажмите кнопку «Экспорт» и выберите нужный формат — TXT, DOCX или PDF. Файл скачается автоматически.",
  },
];

const LANGUAGES = ["Русский 🇷🇺", "English 🇺🇸", "Deutsch 🇩🇪", "Français 🇫🇷", "Español 🇪🇸", "中文 🇨🇳"];

function MicButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-neon-orange/20 animate-pulse-ring-2" />
          <span className="absolute inset-0 rounded-full bg-neon-orange/30 animate-pulse-ring" />
        </>
      )}
      <button
        onClick={onClick}
        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 text-white ${
          isRecording
            ? "bg-gradient-to-br from-neon-orange to-red-500 shadow-[0_0_40px_rgba(255,107,26,0.7)] scale-110"
            : "bg-gradient-to-br from-neon-orange to-neon-purple hover:shadow-[0_0_40px_rgba(155,92,246,0.5)] hover:scale-105"
        }`}
        aria-label={isRecording ? "Остановить запись" : "Начать запись"}
      >
        <Icon name={isRecording ? "MicOff" : "Mic"} size={40} />
      </button>
    </div>
  );
}

function WaveVisualizer({ active }: { active: boolean }) {
  const bars = [4, 7, 3, 9, 5, 12, 6, 10, 4, 8, 3, 11, 5];
  return (
    <div className="flex items-center gap-1 h-10">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${active ? "bg-neon-orange wave-bar" : "bg-muted"}`}
          style={{
            width: 4,
            height: active ? undefined : 8,
            animationDelay: active ? `${i * 0.09}s` : "0s",
            minHeight: 4,
          }}
        />
      ))}
    </div>
  );
}

function HeroSection() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [editedText, setEditedText] = useState("");
  const [lang, setLang] = useState("ru-RU");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const langOptions = [
    { code: "ru-RU", label: "RU 🇷🇺" },
    { code: "en-US", label: "EN 🇺🇸" },
    { code: "de-DE", label: "DE 🇩🇪" },
    { code: "fr-FR", label: "FR 🇫🇷" },
    { code: "es-ES", label: "ES 🇪🇸" },
    { code: "zh-CN", label: "CN 🇨🇳" },
  ];

  const startRecording = () => {
    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Ваш браузер не поддерживает распознавание речи. Используйте Chrome или Edge.");
      return;
    }
    const rec = new SpeechRecognitionCtor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(interim);
      if (final) {
        setEditedText((prev) => (prev ? prev + " " + final : final));
        setTranscript("");
      }
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setTranscript("");
  };

  const handleMic = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const copyText = () => {
    if (editedText) navigator.clipboard.writeText(editedText);
  };

  const clearText = () => {
    setEditedText("");
    setTranscript("");
  };

  const downloadTxt = () => {
    const blob = new Blob([editedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voicetext.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center px-4 py-24 mesh-bg overflow-hidden">
      <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-neon-purple/8 blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-20 left-[5%] w-56 h-56 rounded-full bg-neon-orange/8 blur-3xl pointer-events-none" />

      <div className="text-center mb-12 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-orange/30 bg-neon-orange/10 text-neon-orange text-sm font-body mb-6">
          <span className="w-2 h-2 rounded-full bg-neon-orange animate-pulse inline-block" />
          Бесплатно · Без регистрации · Прямо в браузере
        </div>
        <h1 className="font-display text-6xl md:text-8xl font-bold leading-none mb-4">
          <span className="text-foreground">ГОЛОС</span>
          <br />
          <span className="gradient-text text-glow-orange">В ТЕКСТ</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto font-body leading-relaxed">
          Говорите — сервис мгновенно преобразует речь в текст.<br />
          Поддержка 6+ языков, экспорт, редактор, история.
        </p>
      </div>

      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 md:p-8 animate-fade-up delay-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <WaveVisualizer active={isRecording} />
            {isRecording && (
              <span className="text-neon-orange text-sm font-body animate-pulse">Идёт запись...</span>
            )}
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-body focus:outline-none focus:border-neon-orange/50"
          >
            {langOptions.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="relative min-h-[120px] bg-muted rounded-xl p-4 mb-4 border border-border">
          <textarea
            value={editedText + (transcript ? (editedText ? " " : "") + transcript : "")}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Ваш текст появится здесь... Нажмите кнопку микрофона и начните говорить."
            className="w-full min-h-[100px] bg-transparent text-foreground font-body text-base resize-none focus:outline-none placeholder:text-muted-foreground leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <MicButton isRecording={isRecording} onClick={handleMic} />
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <button
              onClick={copyText}
              disabled={!editedText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-muted hover:border-neon-purple/50 hover:bg-neon-purple/10 text-sm font-body text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="Copy" size={16} />
              Копировать
            </button>
            <button
              onClick={downloadTxt}
              disabled={!editedText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-muted hover:border-neon-orange/50 hover:bg-neon-orange/10 text-sm font-body text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="Download" size={16} />
              TXT
            </button>
            <button
              onClick={clearText}
              disabled={!editedText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-muted hover:border-red-500/50 hover:bg-red-500/10 text-sm font-body text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="Trash2" size={16} />
              Очистить
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-6 text-muted-foreground text-sm animate-fade-up delay-400">
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
            <div
              key={i}
              className={`relative rounded-2xl border ${step.border} ${step.bg} p-8 card-hover`}
            >
              <div className={`font-display text-7xl font-bold opacity-10 absolute top-4 right-6 ${step.color}`}>
                {step.num}
              </div>
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
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-6 card-hover"
            >
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                <Icon name={f.icon} size={20} className={f.color} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-neon-orange/20 bg-gradient-to-br from-neon-orange/10 to-neon-purple/10 p-8 text-center">
          <div className="flex justify-center gap-3 flex-wrap mb-6">
            {LANGUAGES.map((l) => (
              <span key={l} className="px-4 py-2 rounded-full bg-muted border border-border text-foreground font-body text-sm">
                {l}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground font-body">И ещё десятки языков — сервис распознаёт любую речь</p>
        </div>
      </div>
    </section>
  );
}

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
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                open === i ? "border-neon-orange/40 bg-neon-orange/5" : "border-border bg-card"
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-body font-semibold text-foreground">{faq.q}</span>
                <Icon
                  name="ChevronDown"
                  size={20}
                  className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ml-4 ${open === i ? "rotate-180 text-neon-orange" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-muted-foreground font-body leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="contact" className="py-24 px-4 bg-card/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-cyan-400 font-body text-sm uppercase tracking-widest">Свяжитесь с нами</span>
          <h2 className="font-display text-5xl md:text-6xl font-bold text-foreground mt-3">
            <span className="gradient-text">КОНТАКТЫ</span>
          </h2>
          <p className="text-muted-foreground font-body mt-4">Есть вопросы или предложения? Напишите нам — ответим в течение дня.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-10 text-center">
            <Icon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Сообщение отправлено!</h3>
            <p className="text-muted-foreground font-body">Мы ответим вам в ближайшее время.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">Ваше имя</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Иван Иванов"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ivan@example.com"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">Сообщение</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Ваш вопрос или предложение..."
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-orange to-neon-purple text-white font-display font-semibold text-lg hover:shadow-[0_0_30px_rgba(255,107,26,0.4)] hover:scale-[1.02] transition-all duration-300"
            >
              Отправить сообщение
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

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
          <span className="font-display font-bold text-xl text-foreground">
            Voice<span className="text-neon-orange">Text</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-neon-orange font-body text-sm transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#hero"
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-orange text-white font-display font-semibold text-sm hover:bg-neon-orange/90 transition-all"
        >
          <Icon name="Mic" size={14} />
          Начать бесплатно
        </a>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-4 pb-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-muted-foreground hover:text-neon-orange font-body border-b border-border/50 last:border-0"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-orange to-neon-purple flex items-center justify-center">
            <Icon name="Mic" size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-foreground">
            Voice<span className="text-neon-orange">Text</span>
          </span>
        </div>
        <p className="text-muted-foreground font-body text-sm">© 2026 VoiceText — бесплатный сервис распознавания речи</p>
        <div className="flex items-center gap-4 text-muted-foreground text-sm font-body">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-neon-orange transition-colors">{l.label}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

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