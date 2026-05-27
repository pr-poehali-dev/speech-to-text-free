import Icon from "@/components/ui/icon";

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
