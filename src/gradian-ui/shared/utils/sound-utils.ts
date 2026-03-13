"use client";

/**
 * Lightweight Web Audio beep helper used by barcode scanner and other components.
 * Uses an AudioContext with a short sine-wave tone, no external audio files.
 */
export function createBeep(audioContextRef: { current: AudioContext | null }): () => void {
  return () => {
    try {
      let ctx = audioContextRef.current;
      if (!ctx) {
        const AnyWindow = window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioCtor = window.AudioContext || AnyWindow.webkitAudioContext;
        if (!AudioCtor) return;
        ctx = new AudioCtor();
        audioContextRef.current = ctx;
      }

      const play = () => {
        if (!audioContextRef.current) return;
        const c = audioContextRef.current;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, c.currentTime);
        gain.gain.setValueAtTime(0.4, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.18);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(play).catch(() => {});
      } else {
        play();
      }
    } catch {
      // AudioContext unavailable or blocked — silently ignore
    }
  };
}

