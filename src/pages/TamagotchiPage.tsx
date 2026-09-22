import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../auth/AuthProvider";
import { db } from "../lib/firebase";
import { applyPetDecay, createDefaultPetStats, normalizePetStats, type PetStats } from "../lib/petStats";

type AppState = "MENU" | "ACTION";
type ActionType = "MUSIC" | "SLEEP" | "EAT" | "BATH" | "SICK";
type IconType =
  | "NONE"
  | "MEDICINA"
  | "FOODICON"
  | "ZZZICON"
  | "WATERICON"
  | "NOTE";

const clampi = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const LCD_W = 84;
const LCD_H = 48;

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

const PET_DOC_ID = "shared";
const PET_SAVE_DEBOUNCE_MS = 700;

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

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    const text = typeof message === "string" ? message : "Error desconocido";
    return typeof code === "string" ? `${code}: ${text}` : text;
  }

  return error instanceof Error ? error.message : String(error);
}

function assetUrl(fileName: string) {
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

  const ensure = useCallback(() => {
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
  }, []);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const osc = oscRef.current;
    const g = gainRef.current;
    if (!ctx || !g) return;

    try {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
    } catch {
      // Some browsers throw if the audio node is already stopped.
    }

    if (osc) {
      try {
        osc.stop(ctx.currentTime + 0.02);
      } catch {
        // Some browsers throw if the oscillator is already stopped.
      }
      try {
        osc.disconnect();
      } catch {
        // Some browsers throw if the oscillator is already disconnected.
      }
    }
    oscRef.current = null;
  }, []);

  const beep = useCallback(
    async (freqHz: number, ms: number, vol = 0.15) => {
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
    },
    [ensure, stop],
  );

  const playRandomMelody = useCallback(
    async (onDone: () => void) => {
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
    },
    [ensure, beep, stop],
  );

  return { beep, stop, playRandomMelody };
}

function useElementWidth<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  ready: boolean,
) {
  const [w, setW] = useState<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setW(rect.width);
    });

    ro.observe(el);
    setW(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, [ref, ready]);

  return w;
}

export default function TamagotchiPage() {
  const { user } = useAuth();
  const { assets, error } = useAssets();
  const { beep, stop: songStop, playRandomMelody } = useAudio();
  const petDocRef = useMemo(() => doc(db, "tamagotchi", PET_DOC_ID), []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lcdWrapRef = useRef<HTMLDivElement | null>(null);
  const wrapW = useElementWidth(lcdWrapRef, Boolean(assets));

  const petX = 2;
  const petY = 48 - PET_H - 1;
  const menuX = 84 - MENU_W;
  const menuY = 2;

  const [appState, setAppState] = useState<AppState>("MENU");
  const [selected, setSelected] = useState<number>(0);
  const [curAction, setCurAction] = useState<ActionType>("MUSIC");
  const [iconFrame, setIconFrame] = useState<0 | 1>(0);
  const [petFrame, setPetFrame] = useState<0 | 1 | 2 | 3>(0);
  const [messageText, setMessageText] = useState("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const petRef = useRef<PetStats>(createDefaultPetStats());
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  // HUD UI (para texto arriba)
  const [hud, setHud] = useState(() => ({
    hunger: 100,
    energy: 100,
    hygiene: 100,
    health: 100,
    happiness: 100,
    ageTicks: 0,
  }));

  const msgRef = useRef<{ visible: boolean; untilMs: number; idx: number }>({
    visible: false,
    untilMs: 0,
    idx: 0,
  });

  const musicRef = useRef<{ playing: boolean }>({ playing: false });

  // Control de loops de acción (igual Arduino)
  const actionCtrlRef = useRef<{ loopsDone: number; loopsTarget: number }>({
    loopsDone: 0,
    loopsTarget: 8,
  });
  const prevPetFrameRef = useRef<number>(0);

  // Escala SIEMPRE entera y que quepa (para evitar blur)
  const { cssW, cssH } = useMemo(() => {
    const padding = 30; // 12px de padding y 3px de borde a cada lado
    const available = Math.max(0, wrapW - padding);

    // escala entera para que no se vea borroso
    const s = clampi(Math.floor(available / LCD_W), 2, 9);

    // ancho/alto final en CSS (nunca más grande que available)
    const w = Math.min(available, LCD_W * s);
    const h = (w * LCD_H) / LCD_W;

    return { cssW: Math.floor(w), cssH: Math.floor(h) };
  }, [wrapW]);

  const pickIcon = useCallback((): IconType => {
    const p = petRef.current;
    if (p.health <= TH_SICK) return "MEDICINA";
    if (p.hunger <= TH_HUNGER) return "FOODICON";
    if (p.energy <= TH_ENERGY) return "ZZZICON";
    if (p.hygiene <= TH_HYGIENE) return "WATERICON";
    if (p.happiness <= TH_HAPPY) return "NOTE";
    return "NONE";
  }, []);

  const hasAlert = useCallback(() => pickIcon() !== "NONE", [pickIcon]);

  const actionMap: ActionType[] = ["MUSIC", "SLEEP", "EAT", "BATH", "SICK"];

  const showMessage = useCallback((text: string) => {
    const m = msgRef.current;
    m.idx = 0;
    m.visible = true;
    m.untilMs = performance.now() + MSG_DURATION_MS;
    setMessageText(text);
  }, []);

  const refreshHud = useCallback(() => {
    const p = petRef.current;
    setHud({
      hunger: p.hunger,
      energy: p.energy,
      hygiene: p.hygiene,
      health: p.health,
      happiness: p.happiness,
      ageTicks: p.ageTicks,
    });
  }, []);

  const savePetNow = useCallback(async () => {
    if (!user) return;

    const p = petRef.current;
    await setDoc(
      petDocRef,
      {
        hunger: p.hunger,
        energy: p.energy,
        hygiene: p.hygiene,
        health: p.health,
        happiness: p.happiness,
        ageTicks: p.ageTicks,
        lastTickMs: p.lastTickMs,
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
        updatedByEmail: user.email ?? null,
      },
      { merge: true },
    );
  }, [petDocRef, user]);

  const scheduleSavePet = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSyncError(null);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      savePetNow()
        .then(() => {
          setSyncError(null);
        })
        .catch((err) => {
          const message = getErrorMessage(err);
          console.warn("tamagotchi save error:", err);
          setSyncMessage(null);
          setSyncError(`No se pudo guardar en Firebase: ${message}`);
        });
    }, PET_SAVE_DEBOUNCE_MS);
  }, [savePetNow]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      petDocRef,
      (snap) => {
        setSyncError(null);
        const next = snap.exists()
          ? normalizePetStats(snap.data())
          : createDefaultPetStats();

        const changedByElapsedTime = applyPetDecay(next);
        petRef.current = next;
        hydratedRef.current = true;
        refreshHud();

        if (!snap.exists() || changedByElapsedTime) {
          scheduleSavePet();
        }
      },
      (err) => {
        const message = getErrorMessage(err);
        console.warn("tamagotchi snapshot error:", err);
        setSyncError(`No se pudo leer Firebase: ${message}`);
        hydratedRef.current = true;
      },
    );

    return () => unsub();
  }, [petDocRef, refreshHud, scheduleSavePet, user]);

  const finishAction = useCallback(
    (a: ActionType) => {
      // beep final (como tu Arduino)
      if (a !== "MUSIC") {
        if (a === "EAT") {
          beep(988, 50);
          window.setTimeout(() => beep(1319, 90), 70);
        } else if (a === "SLEEP") {
          beep(659, 60);
          window.setTimeout(() => beep(988, 120), 80);
        } else if (a === "BATH") {
          beep(784, 50);
          window.setTimeout(() => beep(1175, 90), 70);
        } else if (a === "SICK") {
          beep(523, 70);
          window.setTimeout(() => beep(988, 130), 90);
        } else {
          beep(880, 60);
          window.setTimeout(() => beep(1175, 90), 85);
        }
      }
      setAppState("MENU");
    },
    [beep],
  );

  const pressLeft = () => {
    if (appState !== "MENU") return;
    setSelected((s) => (s + 4) % 5);
    beep(784, 25);
  };
  const pressRight = () => {
    if (appState !== "MENU") return;
    setSelected((s) => (s + 1) % 5);
    beep(784, 25);
  };
  const pressA = () => {
    if (appState !== "MENU") return;
    startAction(actionMap[selected]);
  };
  const pressB = () => {
    if (appState === "MENU") return;
    songStop();
    musicRef.current.playing = false;
    setAppState("MENU");
    beep(392, 40);
  };

  const startAction = async (a: ActionType) => {
    setCurAction(a);
    setAppState("ACTION");
    setPetFrame(0);

    actionCtrlRef.current.loopsDone = 0;
    actionCtrlRef.current.loopsTarget =
      a === "MUSIC" ? 999 : a === "SICK" ? 2 : 8;

    if (a === "MUSIC") {
      musicRef.current.playing = true;
      await playRandomMelody(() => {
        musicRef.current.playing = false;
        finishAction("MUSIC");
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
    refreshHud();
    scheduleSavePet();
  };

  // teclado
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (appState === "MENU") {
        if (e.key === "ArrowLeft") {
          pressLeft();
          e.preventDefault();
        }
        if (e.key === "ArrowRight") {
          pressRight();
          e.preventDefault();
        }
        if (e.key === "Enter" || k === "a" || e.key === " ") {
          pressA();
          e.preventDefault();
        }
      } else {
        if (e.key === "Escape" || k === "b" || e.key === "Backspace") {
          pressB();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, selected, showMessage]);

  // tick stats + HUD
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!hydratedRef.current) return;

      const now = Date.now();
      const p = petRef.current;

      if (applyPetDecay(p, now)) {
        scheduleSavePet();
      }

      // Sweet messages keep their own rhythm, independent of hourly needs.
      const m = msgRef.current;
      if (!m.visible && !hasAlert() && Math.random() * 100 < MSG_CHANCE_PCT) {
        m.idx = Math.floor(Math.random() * PET_MESSAGES.length);
        m.visible = true;
        m.untilMs = performance.now() + MSG_DURATION_MS;
        setMessageText(PET_MESSAGES[m.idx] ?? "");
      }
      refreshHud();
    }, 60 * 1000);

    return () => window.clearInterval(id);
  }, [hasAlert, refreshHud, scheduleSavePet]);

  // anim frames (pet + icon)
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

  // terminar acciones por loops (NO timeout)
  useEffect(() => {
    const prev = prevPetFrameRef.current;
    const curr = petFrame as number;
    prevPetFrameRef.current = curr;

    if (appState !== "ACTION") return;
    if (curAction === "MUSIC") return;

    // loop completo cuando vuelve a 0 y antes era 3
    if (prev === 3 && curr === 0) {
      actionCtrlRef.current.loopsDone += 1;
      if (
        actionCtrlRef.current.loopsDone >= actionCtrlRef.current.loopsTarget
      ) {
        finishAction(curAction);
      }
    }
  }, [petFrame, appState, curAction, finishAction]);

  // render canvas (fondo negro)
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

      // fondo negro
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, LCD_W, LCD_H);

      // menu
      const menuImg = assets[`sel${selected + 1}`];
      if (menuImg) ctx.drawImage(menuImg, menuX, menuY, MENU_W, MENU_H);

      // pet
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

      // icono
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
      if (hasAlert() && m.visible) {
        m.visible = false;
        setMessageText("");
      } else if (m.visible && now > m.untilMs) {
        m.visible = false;
        setMessageText("");
      }

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
    return () => {
      alive = false;
    };
  }, [
    assets,
    selected,
    appState,
    curAction,
    petFrame,
    iconFrame,
    hasAlert,
    menuX,
    petY,
    pickIcon,
  ]);

  const lcdScale = cssW ? cssW / LCD_W : 1;
  const messageLeft = Math.round((ICON_W + 1) * lcdScale);
  const messageTop = Math.round(1 * lcdScale);
  const messageWidth = Math.min(300, Math.max(0, cssW - messageLeft - 8));
  const messageHeight = Math.round(18 * lcdScale);

  if (error) {
    return (
      <div
        ref={lcdWrapRef}
        style={{
          background: "var(--app-surface)",
          padding: 16,
          borderRadius: 18,
          border: "3px solid var(--app-border-strong)",
          boxShadow: "var(--app-shadow)",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <h3 style={{ margin: 0 }}>Error cargando assets</h3>
        <div style={{ marginTop: 8 }}>{String(error)}</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          Confirma que estén en <b>src/assets</b> y existan:{" "}
          <code>idle1.png</code>, <code>sel1.png</code>,{" "}
          <code>foodIcon1.png</code>, etc.
        </div>
      </div>
    );
  }

  if (!assets) {
    return (
      <div
        style={{
          padding: 16,
          color: "var(--app-text)",
          background: "var(--app-surface)",
          border: "3px solid var(--app-border-strong)",
          borderRadius: 18,
          boxShadow: "var(--app-shadow)",
          fontWeight: 900,
        }}
      >
        Cargando sprites...
      </div>
    );
  }

  const Btn = ({
    label,
    sub,
    onPress,
    disabled,
  }: {
    label: string;
    sub?: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      style={{
        border: "2px solid var(--app-border-strong)",
        background: disabled
          ? "rgba(255,248,232,.48)"
          : "linear-gradient(180deg, #ffe08f, #f6c35f)",
        color: disabled ? "var(--app-dim)" : "var(--app-ink)",
        borderRadius: 16,
        padding: "14px 16px",
        minWidth: 0,
        fontWeight: 800,
        letterSpacing: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        touchAction: "manipulation",
        userSelect: "none",
        width: "100%",
        boxShadow: disabled
          ? "none"
          : "0 5px 0 rgba(85,54,38,.22), 0 9px 18px rgba(91,63,50,.12)",
      }}
    >
      <div style={{ fontSize: 16 }}>{label}</div>
      {sub ? (
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{sub}</div>
      ) : null}
    </button>
  );

  const StatPill = ({ k, v }: { k: string; v: number }) => (
    <div
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,248,232,.86)",
        border: "2px dashed rgba(102,66,45,.34)",
        color: "var(--app-ink)",
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.9 }}>{k}</span>
      <span
        style={{
          padding: "4px 8px",
          borderRadius: 999,
          background: "rgba(246,195,95,.48)",
        }}
      >
        {v}
      </span>
    </div>
  );

  return (
    <div
      style={{
        padding: 0,
        width: "100%",
        minWidth: 0,
        display: "grid",
        placeItems: "center",
        color: "var(--app-text)",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 12,
          padding: "4px 0",
        }}
      >
        <div
          style={{
            position: "relative",
            minWidth: 0,
            background:
              "linear-gradient(180deg, rgba(255,248,232,.96), rgba(247,223,185,.9))",
            padding: "clamp(10px, 2vw, 16px)",
            borderRadius: 24,
            boxShadow: "var(--app-shadow)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 12,
            border: "3px solid var(--app-border-strong)",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 108,
              height: 30,
              left: 34,
              top: -13,
              borderRadius: 6,
              background: "rgba(158,216,209,.64)",
              border: "2px solid rgba(102,66,45,.16)",
              transform: "rotate(-4deg)",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 10,
              top: 16,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 37% 38%, var(--app-ink) 0 3px, transparent 4px), radial-gradient(circle at 63% 38%, var(--app-ink) 0 3px, transparent 4px), radial-gradient(circle at 50% 56%, var(--app-ink) 0 2px, transparent 3px), #f6b6ad",
              border: "2px solid var(--app-border-strong)",
              boxShadow: "0 4px 0 rgba(85,54,38,.16)",
              transform: "rotate(8deg)",
            }}
          />
          <div
            style={{
              textAlign: "center",
              fontWeight: 900,
              color: "var(--app-ink)",
              fontSize: 18,
              textShadow: "0 1px 0 rgba(255,255,255,.7)",
            }}
          >
            Zanahoria
          </div>
          <p style={{ textAlign: "center", margin: 0, color: "var(--app-muted)", fontSize: 13, lineHeight: 1.6 }}>
            Un poquito de comida, música y mucho cariño.
            <br />Nuestra gatita disfruta la vida sin afán.
          </p>

          {/* HUD */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              padding: "2px 0 6px",
            }}
          >
            <StatPill k="Saciedad" v={hud.hunger} />
            <StatPill k="Energía" v={hud.energy} />
            <StatPill k="Limpieza" v={hud.hygiene} />
            <StatPill k="Salud" v={hud.health} />
            <StatPill k="Felicidad" v={hud.happiness} />
          </div>

          {syncError || syncMessage ? (
            <div
              style={{
                border: syncError
                  ? "2px solid rgba(168,63,63,0.45)"
                  : "2px solid var(--app-border)",
                background: syncError
                  ? "rgba(246,182,173,.36)"
                  : "rgba(184,217,156,.36)",
                color: syncError ? "var(--app-danger)" : "var(--app-ink)",
                borderRadius: 14,
                padding: "8px 10px",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.25,
                overflowWrap: "anywhere",
                textAlign: "center",
              }}
            >
              {syncError ?? syncMessage}
            </div>
          ) : null}

          {/* contenedor que define el ancho disponible para escalar */}
          <div
            ref={lcdWrapRef}
            style={{
              background:
                "linear-gradient(180deg, rgba(91,63,50,.16), rgba(91,63,50,.08))",
              padding: 12,
              borderRadius: 20,
              border: "3px solid var(--app-border-strong)",
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              boxShadow: "inset 0 4px 0 rgba(91,63,50,.12)",
            }}
          >
            <div
              style={{ width: "100%", minWidth: 0, display: "flex", justifyContent: "center" }}
            >
              <div
                style={{
                  width: cssW ? `${cssW}px` : "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={LCD_W}
                  height={LCD_H}
                  style={{
                    width: cssW ? `${cssW}px` : "100%",
                    height: cssH ? `${cssH}px` : "auto",
                    maxWidth: "100%",
                    aspectRatio: `${LCD_W} / ${LCD_H}`,
                    imageRendering: "pixelated",
                    border: "4px solid var(--app-ink)",
                    borderRadius: 12,
                    background: "#000",
                    display: "block",
                    boxShadow: "0 5px 0 rgba(85,54,38,.18)",
                  }}
                />
                {messageText ? (
                  <div
                    style={{
                      position: "absolute",
                      left: messageLeft,
                      top: messageTop,
                      width: messageWidth,
                      minHeight: messageHeight,
                      padding: `${Math.max(2, Math.floor(lcdScale * 0.7))}px ${Math.max(
                        3,
                        Math.floor(lcdScale),
                      )}px`,
                      borderRadius: Math.max(2, Math.floor(lcdScale * 0.75)),
                      background: "rgba(255,248,232,.94)",
                      border: "2px solid var(--app-ink)",
                      color: "var(--app-ink)",
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                      fontSize: Math.max(26, Math.floor(lcdScale * 6)),
                      fontWeight: 900,
                      lineHeight: 1.05,
                      letterSpacing: 0,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      whiteSpace: "normal",
                      overflowWrap: "break-word",
                      pointerEvents: "none",
                      textShadow: "none",
                    }}
                  >
                    {messageText}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Botones mobile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <Btn
              label="◀"
              sub="Anterior"
              onPress={pressLeft}
              disabled={appState !== "MENU"}
            />
            <Btn
              label="▶"
              sub="Siguiente"
              onPress={pressRight}
              disabled={appState !== "MENU"}
            />
            <Btn
              label="A"
              sub="Elegir"
              onPress={pressA}
              disabled={appState !== "MENU"}
            />
            <Btn
              label="B"
              sub="Volver"
              onPress={pressB}
              disabled={appState === "MENU"}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--app-muted)",
              fontWeight: 800,
              textAlign: "center",
            }}
          >
            Teclado: ←/→ · Enter/A · Esc/B
          </div>
        </div>
      </div>
    </div>
  );
}
