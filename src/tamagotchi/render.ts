import {
  DEFAULT_POS,
  ACT_BATH,
  ACT_EAT,
  ACT_MUSIC,
  ACT_SICK,
  ACT_SLEEP,
  MENU_SEL, 
  getFrameFor,
  ICON_FOOD,
  ICON_MED,
  ICON_NOTE,
  ICON_WATER,
  ICON_ZZZ,
  PET_MESSAGES
} from "./assets";

import type { Bitmap1bpp } from "./assets";

export const W = 84;
export const H = 48;

export type AppState = "menu" | "action";
export type AlertType = null | "MED" | "FOOD" | "ZZZ" | "WATER" | "NOTE";

export type PetStats = {
  hunger: number;
  energy: number;
  hygiene: number;
  health: number;
  happiness: number;
  ageTicks: number;
};

export type RenderModel = {
  pet: PetStats;

  appState: AppState;
  selected: 0 | 1 | 2 | 3 | 4; // selector del menú (0..4)
  curAction: 0 | 1 | 2 | 3 | 4; // ActionType de assets (ACT_*)

  // animaciones
  petFrame: number; // 0..3
  iconFrame: number; // 0..1

  // mensajes
  msgVisible: boolean;
  currentMsgIdx: number; // índice en PET_MESSAGES

  // alerta (si existe, se prioriza y apaga mensajes)
  alert: AlertType;
};

type Ctx = CanvasRenderingContext2D;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// =========================
// 1bpp bitmap drawer (Adafruit_GFX-like: horizontal bytes, MSB first)
// =========================
export function drawBitmap1bpp(
  ctx: Ctx,
  bmp: Bitmap1bpp,
  x0: number,
  y0: number,
  color = 1,
  invert = false
) {
  const { w, h, data } = bmp;
  const bytesPerRow = Math.ceil(w / 8);

  for (let y = 0; y < h; y++) {
    const rowBase = y * bytesPerRow;
    for (let x = 0; x < w; x++) {
      const b = data[rowBase + (x >> 3)];
      const bit = 7 - (x & 7);
      let on = ((b >> bit) & 1) === 1;
      if (invert) on = !on;
      if (!on) continue;

      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

function drawFrame(ctx: Ctx, bmp: Bitmap1bpp, x: number, y: number) {
  ctx.fillStyle = "#111827"; // “tinta”
  drawBitmap1bpp(ctx, bmp, x, y);
}

function drawLCDBackground(ctx: Ctx) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#e8f3e8";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

function drawTopBarText(ctx: Ctx, text: string) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, 10);

  ctx.fillStyle = "#111827";
  ctx.font = "7px monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text.slice(0, 16), 8, 8);
}

function drawBars(ctx: Ctx, pet: PetStats) {
  // barras tipo Arduino (simple)
  const bar = (x: number, y: number, w: number, val: number) => {
    const v = clamp(val, 0, 100);
    ctx.strokeStyle = "#111827";
    ctx.strokeRect(x, y, w, 4);
    ctx.fillStyle = "#111827";
    ctx.fillRect(x, y, Math.round((w * v) / 100), 4);
  };

  // como tu MVP: dos barras abajo (puedes cambiar a 3-5 si quieres)
  bar(2, 38, 50, pet.hunger);
  bar(2, 43, 50, pet.energy);
}

function alertToIcon(alert: AlertType) {
  switch (alert) {
    case "MED":
      return ICON_MED;
    case "FOOD":
      return ICON_FOOD;
    case "ZZZ":
      return ICON_ZZZ;
    case "WATER":
      return ICON_WATER;
    case "NOTE":
      return ICON_NOTE;
    default:
      return null;
  }
}

function actionToMenuIndex(a: number): 0 | 1 | 2 | 3 | 4 {
  // por si quieres usarlo; tu orden es: music, sleep, eat, bath, sick
  if (a === ACT_MUSIC) return 0;
  if (a === ACT_SLEEP) return 1;
  if (a === ACT_EAT) return 2;
  if (a === ACT_BATH) return 3;
  return 4; // ACT_SICK
}

// =========================
// Render principal
// =========================
export function render(ctx: Ctx, m: RenderModel) {
  drawLCDBackground(ctx);

  const { petX, petY, menuX, menuY } = DEFAULT_POS;

  // 1) Mensaje/alerta arriba
  if (m.alert) {
    // en arduino era icono; acá dibujamos el icono animado en la esquina + texto corto
    const iconSet = alertToIcon(m.alert);
    if (iconSet) {
      drawFrame(ctx, iconSet[m.iconFrame & 1], 2, 2);
    }
    ctx.fillStyle = "#111827";
    ctx.font = "7px monospace";
    ctx.fillText(m.alert, 12, 8);
  } else if (m.msgVisible) {
    const txt = PET_MESSAGES[m.currentMsgIdx] ?? "";
    drawTopBarText(ctx, txt);
  }

  // 2) Menú (bitmap 31x43) según selected
  const menuBmp = MENU_SEL[m.selected] ?? MENU_SEL[0];
  drawFrame(ctx, menuBmp, menuX, menuY);

  // 3) Pet sprite (30x21) según estado/acción
  const act =
    m.appState === "action"
      ? (m.curAction as 0 | 1 | 2 | 3 | 4)
      : (actionToMenuIndex(ACT_MUSIC) as 0 | 1 | 2 | 3 | 4); // idle usa FR_IDLE por default

  const petBmp = getFrameFor(
    m.appState === "action" ? act : (999 as any), // default -> idle en getFrameFor
    m.petFrame
  );

  // Nota: en assets.getFrameFor, default devuelve IDLE.
  drawFrame(ctx, petBmp, petX, petY);

  // 4) Barras
  drawBars(ctx, m.pet);
}

// Helper: si quieres un “tick” de animación por tiempos (igual que Arduino)
export function nextFramesByTime(args: {
  nowMs: number;
  petLastMs: number;
  iconLastMs: number;
  petFrame: number;
  iconFrame: number;
  petFrameMs?: number; // default 250
  iconFrameMs?: number; // default 350
}) {
  const petFrameMs = args.petFrameMs ?? 250;
  const iconFrameMs = args.iconFrameMs ?? 350;

  let petFrame = args.petFrame;
  let iconFrame = args.iconFrame;
  let petLastMs = args.petLastMs;
  let iconLastMs = args.iconLastMs;

  if (args.nowMs - petLastMs >= petFrameMs) {
    petFrame = (petFrame + 1) & 3;
    petLastMs = args.nowMs;
  }

  if (args.nowMs - iconLastMs >= iconFrameMs) {
    iconFrame = (iconFrame + 1) & 1;
    iconLastMs = args.nowMs;
  }

  return { petFrame, iconFrame, petLastMs, iconLastMs };
}
