import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

type PlanStatus = "idea" | "planned" | "done";

type Plan = {
  id: string;
  title: string;
  description?: string;
  links?: string[];
  status: PlanStatus;
  sort: number;

  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdByName?: string | null;

  updatedByUid?: string | null;
  updatedByEmail?: string | null;
  updatedByName?: string | null;

  createdAt?: any;
  updatedAt?: any;
};

const STATUS: { key: PlanStatus; label: string }[] = [
  { key: "idea", label: "Idea" },
  { key: "planned", label: "Planeado" },
  { key: "done", label: "Hecho" },
];

const nameFromEmail = (email?: string | null) =>
  email ? email.split("@")[0] : null;

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linksText, setLinksText] = useState(""); // uno por línea

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, "plans"), orderBy("sort", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Plan[] = snap.docs.map((d) => {
          const data = d.data() as Omit<Plan, "id">;
          return { id: d.id, ...data };
        });
        setPlans(rows);
        setLoading(false);
      },
      (err) => {
        console.warn("plans snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, authLoading]);

  const grouped = useMemo(() => {
    const map: Record<PlanStatus, Plan[]> = { idea: [], planned: [], done: [] };
    for (const p of plans) map[p.status].push(p);
    return map;
  }, [plans]);

  async function createPlan() {
    const t = title.trim();
    if (!t) return;

    if (!user) {
      alert("No hay sesión activa.");
      return;
    }

    const links = linksText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const createdName = user.displayName || nameFromEmail(user.email);

    await addDoc(collection(db, "plans"), {
      title: t,
      description: description.trim() || "",
      links,
      status: "idea" as PlanStatus,
      sort: Date.now(),

      createdByUid: user.uid,
      createdByEmail: user.email ?? null,
      createdByName: createdName ?? null,

      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: createdName ?? null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setTitle("");
    setDescription("");
    setLinksText("");
  }

  async function patchPlan(planId: string, patch: Partial<Plan>) {
    if (!user) return;

    const cleaned: any = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cleaned[k] = v;
    }

    const updatedName = user.displayName || nameFromEmail(user.email);

    await updateDoc(doc(db, "plans", planId), {
      ...cleaned,
      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: updatedName ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  async function removePlan(planId: string) {
    await deleteDoc(doc(db, "plans", planId));
  }

  return (
    <div className="page">
      {/* Responsive CSS local (sin tocar tu setup global) */}
      <style>{`
        .page{
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px;
          display: grid;
          gap: 16px;
        }

        .headerRow{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .board{
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        /* Tablet */
        @media (max-width: 900px){
          .page{ padding: 14px; }
          .board{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* Celular */
        @media (max-width: 600px){
          .page{ padding: 12px; }
          .board{ grid-template-columns: 1fr; }
          .createRow{
            flex-direction: column;
            align-items: stretch;
          }
          .createBtn{
            width: 100%;
          }
          .actionsRow{
            flex-direction: column;
            align-items: stretch;
          }
          .deleteBtn{
            width: 100%;
          }
        }

        /* Botones de estado: que envuelvan bonito */
        .statusBtns{
          display:flex;
          gap:6px;
          flex-wrap: wrap;
        }

        /* Evitar overflow de links largos */
        .linkItem{
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>

      <header className="headerRow">
        <h2 style={{ margin: 0 }}>Planes</h2>
      </header>

      {/* Create */}
      <section style={card}>
        <div style={{ display: "grid", gap: 10 }}>
          <div
            className="createRow"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            <input
              style={{ ...input, flex: 1, minWidth: 220 }}
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              className="createBtn"
              style={primaryBtn}
              onClick={createPlan}
            >
              Agregar
            </button>
          </div>

          <textarea
            style={{ ...input, width: "100%", resize: "vertical" }}
            rows={2}
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <textarea
            style={{ ...input, width: "100%", resize: "vertical" }}
            rows={3}
            placeholder={"Links (opcionales, uno por línea)"}
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
          />
        </div>
      </section>

      {/* Board */}
      <section className="board">
        {STATUS.map((col) => (
          <div key={col.key} style={column}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>{col.label}</h3>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>
                {grouped[col.key].length}
              </span>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {loading && <p style={{ color: "#94a3b8" }}>Cargando…</p>}
              {!loading && grouped[col.key].length === 0 && (
                <p style={{ color: "#94a3b8" }}>Nada aquí.</p>
              )}

              {grouped[col.key].map((p) => (
                <div key={p.id} style={planCard}>
                  <input
                    style={{ ...input, width: "100%", fontWeight: 700 }}
                    value={p.title}
                    onChange={(e) => patchPlan(p.id, { title: e.target.value })}
                  />

                  {p.createdByName || p.createdByEmail ? (
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Agregado por:{" "}
                      {p.createdByName ||
                        (p.createdByEmail
                          ? p.createdByEmail.split("@")[0]
                          : "")}
                    </div>
                  ) : null}

                  <textarea
                    style={{ ...input, width: "100%", resize: "vertical" }}
                    rows={2}
                    placeholder="Descripción"
                    value={p.description || ""}
                    onChange={(e) =>
                      patchPlan(p.id, { description: e.target.value })
                    }
                  />

                  <textarea
                    style={{ ...input, width: "100%", resize: "vertical" }}
                    rows={2}
                    placeholder="Links (uno por línea)"
                    value={(p.links || []).join("\n")}
                    onChange={(e) =>
                      patchPlan(p.id, {
                        links: e.target.value
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                  />

                  {/* Preview links */}
                  {(p.links?.length ?? 0) > 0 ? (
                    <div style={{ display: "grid", gap: 4 }}>
                      {p.links!.slice(0, 4).map((l) => (
                        <a
                          key={l}
                          href={l}
                          target="_blank"
                          rel="noreferrer"
                          className="linkItem"
                          style={{ color: "#93c5fd", fontSize: 13 }}
                        >
                          {l}
                        </a>
                      ))}
                      {p.links!.length > 4 ? (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          +{p.links!.length - 4} más
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className="actionsRow"
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div className="statusBtns">
                      {p.status !== "idea" && (
                        <button
                          style={smallBtn}
                          onClick={() => patchPlan(p.id, { status: "idea" })}
                        >
                          Idea
                        </button>
                      )}
                      {p.status !== "planned" && (
                        <button
                          style={smallBtn}
                          onClick={() => patchPlan(p.id, { status: "planned" })}
                        >
                          Planeado
                        </button>
                      )}
                      {p.status !== "done" && (
                        <button
                          style={smallBtn}
                          onClick={() => patchPlan(p.id, { status: "done" })}
                        >
                          Hecho
                        </button>
                      )}
                    </div>

                    <button
                      className="deleteBtn"
                      style={dangerBtn}
                      onClick={() => removePlan(p.id)}
                    >
                      Borrar
                    </button>
                  </div>

                  {p.updatedByName || p.updatedByEmail ? (
                    <div style={{ color: "#64748b", fontSize: 11 }}>
                      Última edición:{" "}
                      {p.updatedByName ||
                        (p.updatedByEmail
                          ? p.updatedByEmail.split("@")[0]
                          : "")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* styles */
const card: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,.25)",
  borderRadius: 12,
  padding: 12,
  background: "rgba(15,23,42,.35)",
};

const column: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,.18)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(2,6,23,.35)",
  minHeight: 220,
  minWidth: 0, // clave para que no se rompa en grids
};

const planCard: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,.18)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(15,23,42,.35)",
  display: "grid",
  gap: 10,
  minWidth: 0,
};

const input: React.CSSProperties = {
  boxSizing: "border-box",
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.25)",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "10px 10px",
  outline: "none",
  width: "100%",
  fontSize: 16, // importante para móvil (iOS zoom)
};

const primaryBtn: React.CSSProperties = {
  background: "#2563eb",
  border: "1px solid rgba(255,255,255,.12)",
  color: "white",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
  minHeight: 40,
};

const smallBtn: React.CSSProperties = {
  background: "rgba(148,163,184,.12)",
  border: "1px solid rgba(148,163,184,.22)",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
  minHeight: 36,
};

const dangerBtn: React.CSSProperties = {
  background: "rgba(239,68,68,.15)",
  border: "1px solid rgba(239,68,68,.35)",
  color: "#fecaca",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
  minHeight: 36,
};
