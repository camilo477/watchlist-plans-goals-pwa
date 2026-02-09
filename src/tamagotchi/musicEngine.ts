// src/tamagotchi/musicEngine.ts
import type { Melody } from "./songs";
import { SONGS } from "./songs";

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let osc: OscillatorNode | null = null;

let isPlaying = false;

let song: Melody | null = null;
let noteIdx = 0;
let nextAtMs = 0;

function ensureAudio() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (!gain) {
    gain = ctx.createGain();
    gain.gain.value = 0.06;
    gain.connect(ctx.destination);
  }
}

function stopOsc() {
  try {
    if (osc) {
      osc.stop();
      osc.disconnect();
    }
  } catch {}
  osc = null;
}

function playTone(freq: number, ms: number) {
  if (!ctx || !gain) return;
  stopOsc();
  if (freq <= 0 || ms <= 0) return;

  osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = freq;
  osc.connect(gain);

  const now = ctx.currentTime;
  osc.start(now);
  osc.stop(now + ms / 1000);
}

export function startRandomSong() {
  ensureAudio();
  if (!ctx) return;

  if (ctx.state === "suspended") ctx.resume();

  song = SONGS[Math.floor(Math.random() * SONGS.length)] ?? null;
  noteIdx = 0;
  nextAtMs = 0;
  isPlaying = !!song;
}

export function stopSong() {
  isPlaying = false;
  song = null;
  noteIdx = 0;
  nextAtMs = 0;
  stopOsc();
}

export function isSongPlaying() {
  return isPlaying;
}

export function updateSong(nowMs: number) {
  if (!isPlaying || !song) return;

  if (nextAtMs === 0) nextAtMs = nowMs;
  if (nowMs < nextAtMs) return;

  const tempoMs = song.tempoMs;
  const div = song.divs[noteIdx] ?? 4;
  const noteMs = tempoMs / div;

  // gapPct en tus canciones viene como 110/115 (tipo “multiplicador” de pausa).
  // stepMs = duración total del paso (nota + gap)
  const stepMs = noteMs * (song.gapPct / 100);
  const playMs = Math.max(0, Math.min(noteMs, noteMs * 0.9)); // 90% suena, 10% silencio aprox

  const freq = song.notes[noteIdx] ?? 0;
  if (freq > 0) playTone(freq, playMs);

  nextAtMs = nowMs + stepMs;

  noteIdx++;
  if (noteIdx >= song.notes.length) noteIdx = 0;
}
