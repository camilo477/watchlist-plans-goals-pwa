// src/pages/GoalsPage.tsx
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
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

type GoalStatus = "active" | "done" | "paused";
type Priority = "low" | "medium" | "high";

type ChecklistItem = { id: string; text: string; done: boolean };

type GoalProgress = {
  checklist?: { items: ChecklistItem[] };
  money?: { currency: "COP"; targetAmount: number; currentAmount: number };
};

type Goal = {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority?: Priority;
  targetDate?: string; // YYYY-MM-DD
  progress: GoalProgress;
  order: number;

  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdByName?: string | null;

  updatedByUid?: string | null;
  updatedByEmail?: string | null;
  updatedByName?: string | null;

  createdAt?: any;
  updatedAt?: any;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function safeNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtCOP(value: number) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `COP ${value}`;
  }
}

function progressLines(progress: GoalProgress): string[] {
  const lines: string[] = [];

  if (progress.money) {
    const current = Math.max(0, safeNumber(progress.money.currentAmount, 0));
    const target = Math.max(0, safeNumber(progress.money.targetAmount, 0));
    lines.push(`Dinero: ${fmtCOP(current)} / ${fmtCOP(target)}`);
  }

  if (progress.checklist) {
    const items = Array.isArray(progress.checklist.items)
      ? progress.checklist.items
      : [];
    const total = items.length;
    const done = items.filter((i) => i.done).length;
    lines.push(`Checklist: ${done}/${total} pasos`);
  }

  if (lines.length === 0) lines.push("Sin progreso configurado");
  return lines;
}

const nameFromEmail = (email?: string | null) =>
  email ? email.split("@")[0] : null;

function useStyles() {
  const s = useMemo(() => {
    const card: React.CSSProperties = {
      border: "1px solid rgba(148,163,184,0.18)",
      background: "rgba(15,23,42,0.65)",
      borderRadius: 14,
      padding: 14,
      boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
    };

    const label: React.CSSProperties = {
      fontSize: 12,
      color: "#94a3b8",
      display: "block",
      marginBottom: 6,
    };

    const inputBase: React.CSSProperties = {
      width: "100%",
      maxWidth: "100%",
      display: "block",
      boxSizing: "border-box",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(148,163,184,0.22)",
      background: "rgba(2,6,23,0.45)",
      color: "#e2e8f0",
      outline: "none",
      minWidth: 0,
    };

    const textarea: React.CSSProperties = {
      ...inputBase,
      minHeight: 96,
      resize: "vertical",
    };

    const select: React.CSSProperties = {
      ...inputBase,
      appearance: "none",
    };

    const btn: React.CSSProperties = {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(148,163,184,0.25)",
      background: "rgba(30,41,59,0.6)",
      color: "#e2e8f0",
      cursor: "pointer",
      whiteSpace: "nowrap",
    };

    const btnPrimary: React.CSSProperties = {
      ...btn,
      background: "rgba(99,102,241,0.35)",
    };

    const chip: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(148,163,184,0.22)",
      background: "rgba(2,6,23,0.35)",
      color: "#cbd5e1",
      fontSize: 12,
      maxWidth: "100%",
    };

    const hr: React.CSSProperties = {
      border: 0,
      borderTop: "1px solid rgba(148,163,184,0.18)",
      margin: "12px 0",
    };

    const gridAuto: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
      alignItems: "start",
      minWidth: 0,
    };

    return {
      card,
      label,
      inputBase,
      textarea,
      select,
      btn,
      btnPrimary,
      chip,
      hr,
      gridAuto,
    };
  }, []);

  return s;
}

export default function GoalsPage() {
  const s = useStyles();
  const { user, loading: authLoading } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [priority, setPriority] = useState<Priority | "none">("none");
  const [targetDate, setTargetDate] = useState<string>("");

  // ✅ Nuevo: se pueden activar ambos
  const [useChecklist, setUseChecklist] = useState(true);
  const [useMoney, setUseMoney] = useState(false);

  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [currentAmount, setCurrentAmount] = useState<number>(0);

  const [checkText, setCheckText] = useState("");
  const [checkItems, setCheckItems] = useState<ChecklistItem[]>([]);

  // realtime load
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const qy = query(collection(db, "goals"), orderBy("order", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: Goal[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData;

          // ✅ Compat: soporta docs viejos (progress.mode = "money"/"checklist")
          const rawProgress = (data.progress ?? {}) as any;

          let progress: GoalProgress = {};
          if (rawProgress?.mode === "money") {
            progress.money = {
              currency: "COP",
              targetAmount: Math.max(
                0,
                safeNumber(rawProgress.targetAmount, 0)
              ),
              currentAmount: Math.max(
                0,
                safeNumber(rawProgress.currentAmount, 0)
              ),
            };
          } else if (rawProgress?.mode === "checklist") {
            progress.checklist = {
              items: Array.isArray(rawProgress.items) ? rawProgress.items : [],
            };
          } else {
            // nuevo formato
            if (rawProgress?.money) {
              progress.money = {
                currency: "COP",
                targetAmount: Math.max(
                  0,
                  safeNumber(rawProgress.money.targetAmount, 0)
                ),
                currentAmount: Math.max(
                  0,
                  safeNumber(rawProgress.money.currentAmount, 0)
                ),
              };
            }
            if (rawProgress?.checklist) {
              progress.checklist = {
                items: Array.isArray(rawProgress.checklist.items)
                  ? rawProgress.checklist.items
                  : [],
              };
            }
          }

          // default seguro
          if (!progress.money && !progress.checklist) {
            progress = { checklist: { items: [] } };
          }

          return {
            id: d.id,
            title: String(data.title ?? ""),
            description: data.description ? String(data.description) : "",
            status: (data.status ?? "active") as GoalStatus,
            priority: (data.priority ?? undefined) as Priority | undefined,
            targetDate: data.targetDate ? String(data.targetDate) : "",
            progress,
            order: typeof data.order === "number" ? data.order : 0,

            createdByUid: data.createdByUid ?? null,
            createdByEmail: data.createdByEmail ?? null,
            createdByName: data.createdByName ?? null,

            updatedByUid: data.updatedByUid ?? null,
            updatedByEmail: data.updatedByEmail ?? null,
            updatedByName: data.updatedByName ?? null,

            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        setGoals(rows);
        setLoading(false);
      },
      (err) => {
        console.error("goals snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, authLoading]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStatus("active");
    setPriority("none");
    setTargetDate("");

    setUseChecklist(true);
    setUseMoney(false);

    setTargetAmount(0);
    setCurrentAmount(0);

    setCheckText("");
    setCheckItems([]);
  }

  function loadToForm(g: Goal) {
    setEditingId(g.id);
    setTitle(g.title ?? "");
    setDescription(g.description ?? "");
    setStatus(g.status ?? "active");
    setPriority((g.priority ?? "none") as any);
    setTargetDate(g.targetDate ?? "");

    setUseMoney(!!g.progress.money);
    setUseChecklist(!!g.progress.checklist);

    if (g.progress.money) {
      setTargetAmount(
        Math.max(0, safeNumber(g.progress.money.targetAmount, 0))
      );
      setCurrentAmount(
        Math.max(0, safeNumber(g.progress.money.currentAmount, 0))
      );
    } else {
      setTargetAmount(0);
      setCurrentAmount(0);
    }

    if (g.progress.checklist) {
      setCheckItems(
        Array.isArray(g.progress.checklist.items)
          ? g.progress.checklist.items
          : []
      );
    } else {
      setCheckItems([]);
    }
  }

  function buildProgress(): GoalProgress {
    // asegurar al menos uno
    const forceChecklist = !useChecklist && !useMoney;

    const p: GoalProgress = {};

    if (useMoney) {
      p.money = {
        currency: "COP",
        targetAmount: Math.max(0, safeNumber(targetAmount, 0)),
        currentAmount: Math.max(0, safeNumber(currentAmount, 0)),
      };
    }

    if (useChecklist || forceChecklist) {
      p.checklist = { items: checkItems };
    }

    return p;
  }

  async function createGoal() {
    const t = title.trim();
    if (!t) return;

    if (!user) {
      alert("No hay sesión activa.");
      return;
    }

    const whoName = user.displayName || nameFromEmail(user.email);

    const payload = {
      title: t,
      description: description.trim(),
      status,
      priority: priority === "none" ? null : priority,
      targetDate: targetDate || null,
      progress: buildProgress(),
      order: Date.now(),

      createdByUid: user.uid,
      createdByEmail: user.email ?? null,
      createdByName: whoName ?? null,

      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: whoName ?? null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, "goals"), payload);
    resetForm();
  }

  async function saveGoal() {
    if (!editingId) return;
    const t = title.trim();
    if (!t) return;
    if (!user) return;

    const whoName = user.displayName || nameFromEmail(user.email);

    const ref = doc(db, "goals", editingId);
    await updateDoc(ref, {
      title: t,
      description: description.trim(),
      status,
      priority: priority === "none" ? null : priority,
      targetDate: targetDate || null,
      progress: buildProgress(),

      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: whoName ?? null,

      updatedAt: serverTimestamp(),
    });

    resetForm();
  }

  // ✅ Botón Completar/Reabrir
  async function toggleDone(g: Goal) {
    if (!user) return;
    const whoName = user.displayName || nameFromEmail(user.email);

    const ref = doc(db, "goals", g.id);
    const next: GoalStatus = g.status === "done" ? "active" : "done";
    await updateDoc(ref, {
      status: next,
      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: whoName ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  // ✅ Botón Pausada/Activar
  async function togglePaused(g: Goal) {
    if (!user) return;
    const whoName = user.displayName || nameFromEmail(user.email);

    const ref = doc(db, "goals", g.id);
    const next: GoalStatus = g.status === "paused" ? "active" : "paused";
    await updateDoc(ref, {
      status: next,
      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: whoName ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  async function removeGoal(id: string) {
    await deleteDoc(doc(db, "goals", id));
    if (editingId === id) resetForm();
  }

  function addChecklistItem() {
    const t = checkText.trim();
    if (!t) return;
    setCheckItems((prev) => [{ id: uid(), text: t, done: false }, ...prev]);
    setCheckText("");
  }

  function toggleChecklistItem(id: string) {
    setCheckItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    );
  }

  function removeChecklistItem(id: string) {
    setCheckItems((prev) => prev.filter((i) => i.id !== id));
  }

  const grouped = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    const paused = goals.filter((g) => g.status === "paused");
    const done = goals.filter((g) => g.status === "done");
    return { active, paused, done };
  }, [goals]);

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      {/* Form */}
      <div style={s.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: "#e2e8f0" }}>
              {editingId ? "Editar meta" : "Nueva meta"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {editingId ? "Actualiza y guarda" : "Crea una meta en segundos"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {editingId ? (
              <>
                <button style={s.btnPrimary} onClick={saveGoal}>
                  Guardar
                </button>
                <button style={s.btn} onClick={resetForm}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button style={s.btnPrimary} onClick={createGoal}>
                  Crear
                </button>
                <button style={s.btn} onClick={resetForm}>
                  Limpiar
                </button>
              </>
            )}
          </div>
        </div>

        <hr style={s.hr} />

        <div style={{ fontWeight: 700, color: "#cbd5e1", marginBottom: 8 }}>
          Detalles
        </div>
        <div style={s.gridAuto}>
          <div style={{ minWidth: 0 }}>
            <label style={s.label}>Título</label>
            <input
              style={s.inputBase}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <label style={s.label}>Fecha objetivo (opcional)</label>
            <input
              style={s.inputBase}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <label style={s.label}>Estado</label>
            <select
              style={s.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
            >
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
              <option value="done">Completada</option>
            </select>
          </div>

          <div style={{ minWidth: 0 }}>
            <label style={s.label}>Prioridad</label>
            <select
              style={s.select}
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <option value="none">—</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
            <label style={s.label}>Descripción</label>
            <textarea
              style={s.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <hr style={s.hr} />

        <div style={{ fontWeight: 700, color: "#cbd5e1", marginBottom: 8 }}>
          Progreso
        </div>

        {/* ✅ Ahora son switches (puedes activar ambos) */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "#cbd5e1",
            }}
          >
            <input
              type="checkbox"
              checked={useChecklist}
              onChange={(e) => setUseChecklist(e.target.checked)}
            />
            Checklist
          </label>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "#cbd5e1",
            }}
          >
            <input
              type="checkbox"
              checked={useMoney}
              onChange={(e) => setUseMoney(e.target.checked)}
            />
            Dinero
          </label>

          {!useChecklist && !useMoney && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Activa al menos una opción.
            </span>
          )}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
          {useMoney && (
            <div style={s.gridAuto}>
              <div style={{ minWidth: 0 }}>
                <label style={s.label}>Objetivo (COP)</label>
                <input
                  style={s.inputBase}
                  type="number"
                  min={0}
                  value={targetAmount}
                  onChange={(e) =>
                    setTargetAmount(Math.max(0, Number(e.target.value)))
                  }
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <label style={s.label}>Llevan (COP)</label>
                <input
                  style={s.inputBase}
                  type="number"
                  min={0}
                  value={currentAmount}
                  onChange={(e) =>
                    setCurrentAmount(Math.max(0, Number(e.target.value)))
                  }
                />
              </div>

              <div
                style={{ gridColumn: "1 / -1", fontSize: 12, color: "#cbd5e1" }}
              >
                {fmtCOP(Math.max(0, currentAmount))} /{" "}
                {fmtCOP(Math.max(0, targetAmount))}
              </div>
            </div>
          )}

          {useChecklist && (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <label style={s.label}>Agregar paso</label>
                  <input
                    style={s.inputBase}
                    placeholder="Ej: cotizar, reservar, ahorrar"
                    value={checkText}
                    onChange={(e) => setCheckText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                </div>
                <div style={{ alignSelf: "end" }}>
                  <button
                    style={s.btn}
                    onClick={addChecklistItem}
                    type="button"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {checkItems.length > 0 ? (
                <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                  {checkItems.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background: "rgba(2,6,23,0.25)",
                        minWidth: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={it.done}
                        onChange={() => toggleChecklistItem(it.id)}
                      />
                      <div
                        style={{
                          color: "#e2e8f0",
                          textDecoration: it.done ? "line-through" : "none",
                          overflowWrap: "anywhere",
                          minWidth: 0,
                        }}
                      >
                        {it.text}
                      </div>
                      <button
                        style={s.btn}
                        onClick={() => removeChecklistItem(it.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Sin pasos todavía.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ color: "#cbd5e1" }}>
        {loading
          ? "Cargando…"
          : `${goals.length} meta${goals.length === 1 ? "" : "s"} en total`}
      </div>

      <GoalsSection
        title="Activas"
        items={grouped.active}
        s={s}
        onEdit={loadToForm}
        onToggleDone={toggleDone}
        onTogglePaused={togglePaused}
        onDelete={removeGoal}
      />
      <GoalsSection
        title="Pausadas"
        items={grouped.paused}
        s={s}
        onEdit={loadToForm}
        onToggleDone={toggleDone}
        onTogglePaused={togglePaused}
        onDelete={removeGoal}
      />
      <GoalsSection
        title="Completadas"
        items={grouped.done}
        s={s}
        onEdit={loadToForm}
        onToggleDone={toggleDone}
        onTogglePaused={togglePaused}
        onDelete={removeGoal}
      />
    </div>
  );
}

function GoalsSection(props: {
  title: string;
  items: Goal[];
  s: ReturnType<typeof useStyles>;
  onEdit: (g: Goal) => void;
  onToggleDone: (g: Goal) => void;
  onTogglePaused: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const { title, items, s, onEdit, onToggleDone, onTogglePaused, onDelete } =
    props;

  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 800, color: "#e2e8f0" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{items.length}</div>
      </div>

      {items.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 13, padding: "6px 2px" }}>
          —
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          {items.map((g) => {
            const hasMoney = !!g.progress.money;
            const hasChecklist = !!g.progress.checklist;

            const createdBy =
              g.createdByName ||
              (g.createdByEmail ? g.createdByEmail.split("@")[0] : null);

            const updatedBy =
              g.updatedByName ||
              (g.updatedByEmail ? g.updatedByEmail.split("@")[0] : null);

            return (
              <div key={g.id} style={s.card}>
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#e2e8f0",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {g.title}
                    </div>

                    {hasChecklist && <span style={s.chip}>checklist</span>}
                    {hasMoney && <span style={s.chip}>dinero</span>}

                    <span style={s.chip}>
                      {g.status === "active"
                        ? "activa"
                        : g.status === "paused"
                        ? "pausada"
                        : "completada"}
                    </span>
                    {g.priority && (
                      <span style={s.chip}>prio: {g.priority}</span>
                    )}
                    {g.targetDate && (
                      <span style={s.chip}>🎯 {g.targetDate}</span>
                    )}
                  </div>

                  {createdBy ? (
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Agregado por: {createdBy}
                    </div>
                  ) : null}

                  {g.description ? (
                    <div
                      style={{
                        color: "#cbd5e1",
                        lineHeight: 1.4,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {g.description}
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Sin descripción.
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 12,
                      color: "#cbd5e1",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    {progressLines(g.progress).map((line) => (
                      <div key={line}>
                        <span style={{ color: "#94a3b8" }}>Progreso: </span>
                        {line}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={s.btn} onClick={() => onEdit(g)}>
                      Editar
                    </button>

                    {/* ✅ Completar/Reabrir */}
                    <button style={s.btn} onClick={() => onToggleDone(g)}>
                      {g.status === "done" ? "Reabrir" : "Completar"}
                    </button>

                    {/* ✅ Pausar/Activar */}
                    <button style={s.btn} onClick={() => onTogglePaused(g)}>
                      {g.status === "paused" ? "Activar" : "Pausar"}
                    </button>

                    <button style={s.btn} onClick={() => onDelete(g.id)}>
                      Eliminar
                    </button>
                  </div>

                  {updatedBy ? (
                    <div style={{ color: "#64748b", fontSize: 11 }}>
                      Última edición: {updatedBy}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
