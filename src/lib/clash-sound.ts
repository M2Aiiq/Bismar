// Web Audio API Synthesizer for premium retro 8-bit sound effects in Organ Clash

let isMutedGlobal = false;

export function toggleGlobalMute() {
  isMutedGlobal = !isMutedGlobal;
  return isMutedGlobal;
}

export function isGlobalMuted() {
  return isMutedGlobal;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || isMutedGlobal) return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
}

export function playAttackSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.25);
  
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.25);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

export function playCureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.35);
  
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

export function playImmunitySound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "triangle";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.setValueAtTime(600, ctx.currentTime + 0.08);
  osc.frequency.setValueAtTime(800, ctx.currentTime + 0.16);
  
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.32);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.32);
}

export function playDeathSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.55);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.55);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.55);
}

export function playTurnSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
  
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
  osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
  osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.65);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.65);
}
