import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";

type PlanStatus = "idea" | "planned" | "done";

type Plan = {
  id: string;
  title: string;
  description?: string;
  links?: string[];
  status: PlanStatus;
  sort: number;
};

type Status = "pending" | "watching" | "done";
type TmdbMediaType = "movie" | "tv";

type WatchItem = {
  id: string;
  tmdbId: number;
  mediaType: TmdbMediaType;
  title: string;
  posterPath?: string | null;
  status: Status;
  season?: number | null;
  episode?: number | null;
  createdAt?: any;
  updatedAt?: any;
};

type Candidate =
  | {
      kind: "plan";
      id: string;
      title: string;
      subtitle?: string;
      links?: string[];
      status: PlanStatus;
    }
  | {
      kind: "watch";
      id: string;
      title: string;
      subtitle?: string;
      posterPath?: string | null;
      mediaType: TmdbMediaType;
      status: Status;
      season?: number | null;
      episode?: number | null;
    };

const img = (path?: string | null) =>
  path ? `https://image.tmdb.org/t/p/w342${path}` : "";

export default function RoulettePage() {
  const nav = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);

  const [source, setSource] = useState<"mix" | "plans" | "watch">("mix");
  const [includeDone, setIncludeDone] = useState(false);

  const [spinning, setSpinning] = useState(false);
  const [highlight, setHighlight] = useState<Candidate | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const timeoutsRef = useRef<number[]>([]);

  // --- Firestore: Plans ---
  useEffect(() => {
    const q = query(collection(db, "plans"), orderBy("sort", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Plan[] = snap.docs.map((d) => {
          const data = d.data() as Omit<Plan, "id">;
          return { id: d.id, ...data };
        });
        setPlans(rows);
      },
      (e) => console.warn("roulette plans snapshot:", e)
    );
    return () => unsub();
  }, []);

  // --- Firestore: Watchlist ---
  useEffect(() => {
    const q = query(collection(db, "watchlist"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: WatchItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as WatchItem[];
        setWatch(rows);
      },
      (e) => console.warn("roulette watchlist snapshot:", e)
    );
    return () => unsub();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t);
      timeoutsRef.current = [];
    };
  }, []);

  const planCandidates = useMemo<Candidate[]>(() => {
    const filtered = includeDone
      ? plans
      : plans.filter((p) => p.status !== "done");

    return filtered.map((p) => ({
      kind: "plan",
      id: p.id,
      title: p.title,
      subtitle:
        p.status === "idea"
          ? "Plan • Idea"
          : p.status === "planned"
          ? "Plan • Planeado"
          : "Plan • Hecho",
      links: p.links || [],
      status: p.status,
    }));
  }, [plans, includeDone]);

  const watchCandidates = useMemo<Candidate[]>(() => {
    const filtered = includeDone
      ? watch
      : watch.filter((w) => w.status !== "done");

    return filtered.map((w) => {
      const type = w.mediaType === "movie" ? "Película" : "Serie";
      const st =
        w.status === "pending"
          ? "Pendiente"
          : w.status === "watching"
          ? "Viendo"
          : "Visto";
      const prog =
        w.mediaType === "tv" && w.status === "watching"
          ? ` • T${w.season ?? 1} E${w.episode ?? 1}`
          : "";
      return {
        kind: "watch",
        id: w.id,
        title: w.title,
        subtitle: `${type} • ${st}${prog}`,
        posterPath: w.posterPath ?? null,
        mediaType: w.mediaType,
        status: w.status,
        season: w.season ?? null,
        episode: w.episode ?? null,
      };
    });
  }, [watch, includeDone]);

  const pool = useMemo(() => {
    if (source === "plans") return planCandidates;
    if (source === "watch") return watchCandidates;
    return [...planCandidates, ...watchCandidates];
  }, [source, planCandidates, watchCandidates]);

  function clearTimers() {
    for (const t of timeoutsRef.current) window.clearTimeout(t);
    timeoutsRef.current = [];
  }

  function spin() {
    if (spinning) return;

    setErr(null);
    setWinner(null);

    if (pool.length === 0) {
      setErr("No hay nada para elegir con la configuración actual.");
      return;
    }

    setSpinning(true);

    // ganador real
    const final = pool[Math.floor(Math.random() * pool.length)];

    // secuencia para animación (último = final)
    const steps = Math.min(36, Math.max(18, pool.length + 12));
    const seq: Candidate[] = [];
    for (let i = 0; i < steps - 1; i++) {
      seq.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    seq.push(final);

    clearTimers();

    let total = 0;
    for (let i = 0; i < seq.length; i++) {
      const t = i / (seq.length - 1); // 0..1
      const delay = 45 + Math.round(240 * t * t); // ease-out
      total += delay;

      const id = window.setTimeout(() => {
        setHighlight(seq[i]);
      }, total);

      timeoutsRef.current.push(id);
    }

    // cierre
    const endId = window.setTimeout(() => {
      setWinner(final);
      setHighlight(final);
      setSpinning(false);
    }, total + 80);

    timeoutsRef.current.push(endId);
  }

  function goToWinner() {
    if (!winner) return;

    if (winner.kind === "plan") {
      nav("/planes");
      return;
    }
    nav("/watchlist");
  }

  function copyTitle() {
    if (!winner) return;
    navigator.clipboard?.writeText(winner.title).catch(() => {});
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <header>
        <h2 style={{ margin: 0 }}>Ruleta</h2>
        <p style={{ color: "#cbd5e1", marginTop: 6 }}>
          Elige al azar un plan o algo para ver
        </p>
      </header>

      <section style={card}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setSource("mix")}
              style={source === "mix" ? pillActive : pill}
              disabled={spinning}
            >
              Mixto
            </button>
            <button
              onClick={() => setSource("plans")}
              style={source === "plans" ? pillActive : pill}
              disabled={spinning}
            >
              Solo planes
            </button>
            <button
              onClick={() => setSource("watch")}
              style={source === "watch" ? pillActive : pill}
              disabled={spinning}
            >
              Solo watchlist
            </button>
          </div>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "#e2e8f0",
            }}
          >
            <input
              type="checkbox"
              checked={includeDone}
              onChange={(e) => setIncludeDone(e.target.checked)}
              disabled={spinning}
            />
            Incluir hechos/vistos
          </label>

          <div style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 13 }}>
            Pool: <strong style={{ color: "#e2e8f0" }}>{pool.length}</strong>{" "}
            (Planes {planCandidates.length} • Watchlist {watchCandidates.length}
            )
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {err ? <div style={errorBox}>{err}</div> : null}

          <div style={stage}>
            {!highlight ? (
              <div style={{ color: "#94a3b8" }}>
                Presiona <strong>Girar</strong> para elegir.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {highlight.kind === "watch" ? (
                    <img
                      src={
                        highlight.posterPath ? img(highlight.posterPath) : ""
                      }
                      alt=""
                      style={poster}
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src = "")
                      }
                    />
                  ) : (
                    <div style={planIcon}>
                      <span style={{ fontSize: 22 }}></span>
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 4 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#e2e8f0",
                      }}
                    >
                      {highlight.title}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>
                      {highlight.subtitle || ""}
                      {spinning ? " • girando..." : ""}
                    </div>
                  </div>
                </div>

                {winner ? (
                  <div style={winBox}>
                    <div style={{ fontWeight: 800 }}>Resultado</div>
                    <div style={{ color: "#cbd5e1" }}>
                      {winner.kind === "plan" ? "Plan elegido" : "Para ver"}:{" "}
                      <strong>{winner.title}</strong>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button style={primaryBtn} onClick={spin}>
                        Girar otra vez
                      </button>
                      <button style={smallBtn} onClick={goToWinner}>
                        Ir a su sección
                      </button>
                      <button style={smallBtn} onClick={copyTitle}>
                        Copiar título
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              style={spinning || pool.length === 0 ? disabledBigBtn : bigBtn}
              onClick={spin}
              disabled={spinning || pool.length === 0}
              title={
                pool.length === 0 ? "No hay elementos para elegir" : "Girar"
              }
            >
              {spinning ? "Girando…" : "Girar"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* styles */
const card: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,.25)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(15,23,42,.35)",
};

const pill: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(148,163,184,.08)",
  color: "#e2e8f0",
  cursor: "pointer",
};

const pillActive: React.CSSProperties = {
  ...pill,
  border: "1px solid rgba(56,189,248,.45)",
  background: "rgba(56,189,248,.14)",
};

const stage: React.CSSProperties = {
  border: "1px dashed rgba(148,163,184,.25)",
  borderRadius: 14,
  padding: 14,
  background: "rgba(2,6,23,.25)",
  minHeight: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const poster: React.CSSProperties = {
  width: 64,
  height: 96,
  borderRadius: 12,
  objectFit: "cover",
  background: "rgba(148,163,184,.08)",
  border: "1px solid rgba(148,163,184,.18)",
};

const planIcon: React.CSSProperties = {
  width: 64,
  height: 96,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(148,163,184,.08)",
  border: "1px solid rgba(148,163,184,.18)",
};

const bigBtn: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid rgba(56,189,248,.35)",
  background: "rgba(56,189,248,.16)",
  color: "#e2e8f0",
  cursor: "pointer",
  fontWeight: 800,
  minWidth: 160,
};

const disabledBigBtn: React.CSSProperties = {
  ...bigBtn,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(148,163,184,.08)",
  color: "#94a3b8",
  cursor: "not-allowed",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.12)",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const smallBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(148,163,184,.08)",
  color: "#e2e8f0",
  cursor: "pointer",
};

const winBox: React.CSSProperties = {
  marginTop: 6,
  border: "1px solid rgba(34,197,94,.35)",
  background: "rgba(34,197,94,.10)",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 10,
};

const errorBox: React.CSSProperties = {
  border: "1px solid rgba(248,113,113,.35)",
  background: "rgba(248,113,113,.10)",
  borderRadius: 12,
  padding: 12,
  color: "#fecaca",
  fontSize: 13,
};
