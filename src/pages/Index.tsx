import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import HeroSection from "@/components/speech/HeroSection";
import { NAV_LINKS, HOW_STEPS, FEATURES, FAQS, LANGUAGES } from "@/components/speech/types";

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

// ─── How Section ──────────────────────────────────────────────────────────────

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
              <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Ваш вопрос или предложение..."
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/50 transition-colors resize-none" rows={5} />
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
