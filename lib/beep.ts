let audioContext: AudioContext | null = null;

export function unlockScanBeep() {
  if (typeof window === "undefined") return;
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  audioContext ??= new Context();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

function pulse(start: number, duration: number) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 2730;
  const peak = 0.28;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.setValueAtTime(peak, start + duration - 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playScanBeep() {
  unlockScanBeep();
  if (!audioContext) return;

  pulse(audioContext.currentTime, 0.22);
}
