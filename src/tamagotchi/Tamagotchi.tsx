// src/tamagotchi/Tamagotchi.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_POS,
  MENU_SEL,
  getFrameFor,
  ICON_FOOD,
  ICON_MED,
  ICON_NOTE,
  ICON_WATER,
  ICON_ZZZ,
  ACT_MUSIC,
} from "./assets";
import { drawBitmap1bpp } from "./render";
import {
  startRandomSong,
  stopSong,
  updateSong,
  isSongPlaying,
} from "./musicEngine";

type AlertType = null | "MED" | "FOOD" | "ZZZ" | "WATER" | "NOTE";

const W = 84;
const H = 48;

export default function Tamagotchi() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selected] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [action, setAction] = useState<number>(ACT_MUSIC);
  const [petFrame] = useState(0);
  const [iconFrame] = useState(0);
  const [alert] = useState<AlertType>(null);

  const alertIconFrame = useMemo(() => {
    if (!alert) return null;
    if (alert === "MED") return ICON_MED[iconFrame & 1];
    if (alert === "FOOD") return ICON_FOOD[iconFrame & 1];
    if (alert === "ZZZ") return ICON_ZZZ[iconFrame & 1];
    if (alert === "WATER") return ICON_WATER[iconFrame & 1];
    return ICON_NOTE[iconFrame & 1];
  }, [alert, iconFrame]);

  const drawBitmap = (bmp: any, x: number, y: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    drawBitmap1bpp(ctx, bmp, x, y);
  };

  useEffect(() => {
    let raf = 0;

    const tick = (t: number) => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) {
        raf = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, W, H);

      const { petX, petY, menuX, menuY } = DEFAULT_POS;

      drawBitmap(MENU_SEL[selected], menuX, menuY);
      drawBitmap(getFrameFor(action as any, petFrame), petX, petY);
      if (alertIconFrame) drawBitmap(alertIconFrame, 2, 2);

      updateSong(t);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selected, action, petFrame, alertIconFrame]);

  const handleActionMusic = () => {
    if (!isSongPlaying()) startRandomSong();
    else stopSong();
    setAction(ACT_MUSIC);
  };

  const handlePressB = () => {
    stopSong();
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ imageRendering: "pixelated" }}
      />
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={handleActionMusic}>MUSIC</button>
        <button onClick={handlePressB}>B</button>
      </div>
    </div>
  );
}
