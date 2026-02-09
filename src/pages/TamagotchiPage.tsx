import React, { useEffect, useMemo, useRef, useState } from "react";

type AppState = "MENU" | "ACTION";
type ActionType = "MUSIC" | "SLEEP" | "EAT" | "BATH" | "SICK";
type IconType =
  | "NONE"
  | "MEDICINA"
  | "FOODICON"
  | "ZZZICON"
  | "WATERICON"
  | "NOTE";

type PetStats = {
  hunger: number;
  energy: number;
  hygiene: number;
  health: number;
  happiness: number;
  ageTicks: number;
  lastTickMs: number;
};

const clampi = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const LCD_W = 84;
const LCD_H = 48;
const SCALE = 7;

const PET_W = 30;
const PET_H = 21;
const MENU_W = 31;
const MENU_H = 43;

const ICON_W = 7;
const ICON_H = 16;

const TH_SICK = 60;
const TH_HUNGER = 30;
const TH_ENERGY = 25;
const TH_HYGIENE = 25;
const TH_HAPPY = 40;

const DEBUG_SPEEDUP = true;
const PET_TICK_MS = DEBUG_SPEEDUP ? 5000 : 60000;

const ICON_FRAME_MS = 350;
const PET_FRAME_MS = 250;
const RENDER_MS = 33;

const MSG_CHANCE_PCT = 20;
const MSG_DURATION_MS = 2500;

const PET_MESSAGES = [
  "Te amo",
  "Te adoro",
  "Wara wara",
  "Mi personita",
  "Gracias",
  "Tu increible",
  "Me encantas",
  "Siempre",
  "Eres mi paz",
  "Toy feliz",
  "Contigo todo",
  "Te elijo",
  "Te extrano",
  "Me haces bien",
  "Eres mi sol",
  "Mi amor",
  "Ti amo",
  "Eres mi todo",
  "Besito?",
  "Abracito?",
  "Gracias",
  "Estoy feliz",
  "Toy bien",
  "Quiero verte",
  "Sonrie",
  "Me gustas",
  "Estas bonita",
  "Linda",
  "La mejor",
  "Dianita",
  "tuyo",
  "Soy tu bebe",
  "Mimos",
  "Modo cute",
  "Beso",
  "Amor al 100%",
  "Soy tu fan",
  "Te presumo",
  "Que guapa",
  "Yo te cuido",
  "Te adoro",
];

function assetUrl(fileName: string) {
  // Vite: resuelve desde este archivo hacia ../assets
  return new URL(`../assets/${fileName}`, import.meta.url).toString();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    img.src = src;
  });
}

type AssetMap = Record<string, HTMLImageElement>;

function useAssets() {
  const [assets, setAssets] = useState<AssetMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = useMemo(() => {
    const frames4 = (base: string) => [1, 2, 3, 4].map((i) => `${base}${i}`);
    return [
      ...frames4("idle"),
      ...frames4("eat"),
      ...frames4("bath"),
      ...frames4("sleep"),
      ...frames4("sick"),
      ...frames4("music"),

      "sel1",
      "sel2",
      "sel3",
      "sel4",
      "sel5",

      "foodIcon1",
      "foodIcon2",
      "medicina1",
      "medicina2",
      "nota1",
      "nota2",
      "water1",
      "water2",
      "zzz1",
      "zzz2",
    ];
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const entries = await Promise.all(
          names.map(async (n) => {
            const img = await loadImage(assetUrl(`${n}.png`));
            return [n, img] as const;
          }),
        );
        if (!alive) return;
        const map: AssetMap = {};
        for (const [n, img] of entries) map[n] = img;
        setAssets(map);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error cargando assets");
      }
    })();
    return () => {
      alive = false;
    };
  }, [names]);

  return { assets, error };
}

function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const ensure = () => {
    if (!ctxRef.current) {
      const AudioCtx = (window.AudioContext ||
        (window as any).webkitAudioContext) as any;
      ctxRef.current = new AudioCtx();
    }
    const ctx = ctxRef.current!;
    if (!gainRef.current) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(ctx.destination);
      gainRef.current = g;
    }
    return ctx;
  };

  const stop = () => {
    const ctx = ctxRef.current;
    const osc = oscRef.current;
    const g = gainRef.current;
    if (!ctx || !g) return;

    try {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
    } catch {}

    if (osc) {
      try {
        osc.stop(ctx.currentTime + 0.02);
      } catch {}
      try {
        osc.disconnect();
      } catch {}
    }
    oscRef.current = null;
  };

  const beep = async (freqHz: number, ms: number, vol = 0.15) => {
    const ctx = ensure();
    if (ctx.state === "suspended") await ctx.resume();

    stop();

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freqHz;

    const g = gainRef.current!;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.005);

    osc.connect(g);
    osc.start();
    oscRef.current = osc;

    window.setTimeout(() => stop(), ms);
  };

  const playRandomMelody = async (onDone: () => void) => {
    const ctx = ensure();
    if (ctx.state === "suspended") await ctx.resume();

    const melodies: number[][] = [
      [784, 988, 1175, 988, 784, 659, 784],
      [523, 659, 784, 659, 523, 440, 523],
      [392, 494, 587, 494, 392, 330, 392],
    ];
    const m = melodies[Math.floor(Math.random() * melodies.length)];
    let i = 0;

    const step = async () => {
      if (i >= m.length) {
        stop();
        onDone();
        return;
      }
      await beep(m[i], 140, 0.12);
      i++;
      window.setTimeout(step, 170);
    };

    step();
  };

  return { beep, stop, playRandomMelody };
}

export default function TamagotchiPage() {
  const { assets, error } = useAssets();
  const { beep, stop: songStop, playRandomMelody } = useAudio();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const petX = 2;
  const petY = 48 - PET_H - 1;
  const menuX = 84 - MENU_W;
  const menuY = 2;

  const [appState, setAppState] = useState<AppState>("MENU");
  const [selected, setSelected] = useState<number>(0);

  const [curAction, setCurAction] = useState<ActionType>("MUSIC");

  const [iconFrame, setIconFrame] = useState<0 | 1>(0);
  const [petFrame, setPetFrame] = useState<0 | 1 | 2 | 3>(0);

  const petRef = useRef<PetStats>({
    hunger: 100,
    energy: 100,
    hygiene: 100,
    health: 100,
    happiness: 100,
    ageTicks: 0,
    lastTickMs: performance.now(),
  });

  const msgRef = useRef<{ visible: boolean; untilMs: number; idx: number }>({
    visible: false,
    untilMs: 0,
    idx: 0,
  });

  const musicRef = useRef<{ playing: boolean }>({ playing: false });

  const pickIcon = (): IconType => {
    const p = petRef.current;
    if (p.health <= TH_SICK) return "MEDICINA";
    if (p.hunger <= TH_HUNGER) return "FOODICON";
    if (p.energy <= TH_ENERGY) return "ZZZICON";
    if (p.hygiene <= TH_HYGIENE) return "WATERICON";
    if (p.happiness <= TH_HAPPY) return "NOTE";
    return "NONE";
  };

  const hasAlert = () => pickIcon() !== "NONE";

  const startAction = async (a: ActionType) => {
    setCurAction(a);
    setAppState("ACTION");
    setPetFrame(0);

    if (a === "MUSIC") {
      musicRef.current.playing = true;
      await playRandomMelody(() => {
        musicRef.current.playing = false;
        setAppState("MENU");
      });
    } else if (a === "SLEEP") {
      beep(330, 80);
    } else if (a === "EAT") {
      beep(784, 40);
      window.setTimeout(() => beep(988, 40), 60);
    } else if (a === "BATH") {
      beep(523, 50);
    } else if (a === "SICK") {
      beep(220, 120);
    }

    const p = petRef.current;
    if (a === "EAT") {
      p.hunger = 100;
      p.happiness = clampi(p.happiness + 5, 0, 100);
    } else if (a === "SLEEP") {
      p.energy = 100;
    } else if (a === "BATH") {
      p.hygiene = 100;
    } else if (a === "SICK") {
      p.health = 100;
    } else if (a === "MUSIC") {
      p.happiness = 100;
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (appState === "MENU") {
        if (e.key === "ArrowLeft") {
          setSelected((s) => (s + 4) % 5);
          beep(784, 25);
          e.preventDefault();
        }
        if (e.key === "ArrowRight") {
          setSelected((s) => (s + 1) % 5);
          beep(784, 25);
          e.preventDefault();
        }
        if (e.key === "Enter" || k === "a" || e.key === " ") {
          const map: ActionType[] = ["MUSIC", "SLEEP", "EAT", "BATH", "SICK"];
          startAction(map[selected]);
          e.preventDefault();
        }
      } else {
        if (e.key === "Escape" || k === "b" || e.key === "Backspace") {
          songStop();
          musicRef.current.playing = false;
          setAppState("MENU");
          beep(392, 40);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, selected]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const p = petRef.current;

      if (now - p.lastTickMs >= PET_TICK_MS) {
        while (now - p.lastTickMs >= PET_TICK_MS) {
          p.lastTickMs += PET_TICK_MS;
          p.ageTicks++;

          p.hunger = clampi(p.hunger - 2, 0, 100);
          p.energy = clampi(p.energy - 1, 0, 100);
          p.hygiene = clampi(p.hygiene - 1, 0, 100);
          p.happiness = clampi(p.happiness - 1, 0, 100);

          if (p.hunger <= 80) {
            p.health = clampi(p.health - 2, 0, 100);
            p.happiness = clampi(p.happiness - 1, 0, 100);
          }
          if (p.energy <= 20) {
            p.happiness = clampi(p.happiness - 1, 0, 100);
          }
          if (p.hygiene <= 20) {
            p.health = clampi(p.health - 1, 0, 100);
          }
          if (p.health <= 30) {
            p.happiness = clampi(p.happiness - 2, 0, 100);
          }

          const m = msgRef.current;
          if (
            !m.visible &&
            !hasAlert() &&
            Math.random() * 100 < MSG_CHANCE_PCT
          ) {
            m.idx = Math.floor(Math.random() * PET_MESSAGES.length);
            m.visible = true;
            m.untilMs = performance.now() + MSG_DURATION_MS;
          }
        }
      }
    }, 80);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;

    let lastIcon = performance.now();
    let lastPet = performance.now();

    const tick = () => {
      if (!alive) return;
      const now = performance.now();

      if (now - lastIcon >= ICON_FRAME_MS) {
        lastIcon = now;
        setIconFrame((f) => (f === 0 ? 1 : 0));
      }

      if (now - lastPet >= PET_FRAME_MS) {
        lastPet = now;
        setPetFrame((f) => ((f + 1) & 3) as any);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (appState !== "ACTION") return;
    if (curAction === "MUSIC") return;

    const ms = curAction === "SICK" ? 600 : 2000;
    const id = window.setTimeout(() => {
      if (curAction === "EAT") {
        beep(988, 50);
        window.setTimeout(() => beep(1319, 90), 70);
      } else if (curAction === "SLEEP") {
        beep(659, 60);
        window.setTimeout(() => beep(988, 120), 80);
      } else if (curAction === "BATH") {
        beep(784, 50);
        window.setTimeout(() => beep(1175, 90), 70);
      } else if (curAction === "SICK") {
        beep(523, 70);
        window.setTimeout(() => beep(988, 130), 90);
      } else {
        beep(880, 60);
        window.setTimeout(() => beep(1175, 90), 85);
      }

      setAppState("MENU");
    }, ms);

    return () => window.clearTimeout(id);
  }, [appState, curAction, beep]);

  useEffect(() => {
    if (!assets) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let alive = true;
    let lastRender = performance.now();

    const draw = () => {
      if (!alive) return;

      const now = performance.now();
      if (now - lastRender < RENDER_MS) {
        requestAnimationFrame(draw);
        return;
      }
      lastRender = now;

      ctx.clearRect(0, 0, LCD_W, LCD_H);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, LCD_W, LCD_H);

      const menuImg = assets[`sel${selected + 1}`];
      if (menuImg) ctx.drawImage(menuImg, menuX, menuY, MENU_W, MENU_H);

      const frameIdx = (petFrame as number) + 1;

      const actionKey = (() => {
        if (appState === "ACTION") {
          if (curAction === "MUSIC") return "music";
          if (curAction === "SLEEP") return "sleep";
          if (curAction === "EAT") return "eat";
          if (curAction === "BATH") return "bath";
          if (curAction === "SICK") return "sick";
        }
        return "idle";
      })();

      const petImg = assets[`${actionKey}${frameIdx}`];
      if (petImg) ctx.drawImage(petImg, petX, petY, PET_W, PET_H);

      const iconType = pickIcon();
      if (iconType !== "NONE") {
        const iconName =
          iconType === "MEDICINA"
            ? `medicina${iconFrame + 1}`
            : iconType === "FOODICON"
              ? `foodIcon${iconFrame + 1}`
              : iconType === "ZZZICON"
                ? `zzz${iconFrame + 1}`
                : iconType === "WATERICON"
                  ? `water${iconFrame + 1}`
                  : `nota${iconFrame + 1}`;

        const ic = assets[iconName];
        if (ic) ctx.drawImage(ic, 0, 0, ICON_W, ICON_H);
      }

      const m = msgRef.current;
      if (hasAlert()) m.visible = false;

      if (m.visible && now <= m.untilMs) {
        const text = PET_MESSAGES[m.idx] ?? "";

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 84, 10);

        ctx.fillStyle = "#000000";
        ctx.font = "8px monospace";
        ctx.textBaseline = "top";
        ctx.fillText(text, ICON_W + 1, 1);
      } else if (m.visible && now > m.untilMs) {
        m.visible = false;
      }

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
    return () => {
      alive = false;
    };
  }, [assets, selected, appState, curAction, petFrame, iconFrame]);

  if (error) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <h3>Error cargando assets</h3>
        <div>{String(error)}</div>
        <div style={{ marginTop: 8 }}>
          Confirma que estén en <b>src/assets/</b> y que existan nombres como{" "}
          <code>idle1.png</code>, <code>sel1.png</code>,{" "}
          <code>foodIcon1.png</code>.
        </div>
      </div>
    );
  }

  if (!assets) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Cargando sprites...
      </div>
    );
  }

  const p = petRef.current;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#111",
        padding: 24,
        gap: 16,
        fontFamily: "system-ui",
        color: "#eee",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Controles:</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            ←/→ mover · Enter/A iniciar · Esc/B cancelar música
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            Estado: {appState} · Acción: {curAction} · Selección: {selected + 1}
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>
          <div>Hambre: {p.hunger}</div>
          <div>Energía: {p.energy}</div>
          <div>Higiene: {p.hygiene}</div>
          <div>Salud: {p.health}</div>
          <div>Felicidad: {p.happiness}</div>
        </div>
      </div>

      <div
        style={{
          background: "#c33",
          padding: 18,
          borderRadius: 16,
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            marginBottom: 10,
            color: "#222",
          }}
        >
          Nokia 5110 (sim)
        </div>

        <div
          style={{
            background: "#fff",
            padding: 10,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
          }}
        >
          <canvas
            ref={canvasRef}
            width={LCD_W}
            height={LCD_H}
            style={{
              width: LCD_W * SCALE,
              height: LCD_H * SCALE,
              imageRendering: "pixelated",
              border: "3px solid #000",
              borderRadius: 6,
              background: "#fff",
            }}
          />
        </div>
      </div>
    </div>
  );
}
