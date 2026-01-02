import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  getDetails,
  searchMulti,
  titleOf,
  yearOf,
  type TmdbDetails,
  type TmdbMediaType,
  type TmdbSearchItem,
} from "../lib/tmdb";
import { useAuth } from "../auth/AuthProvider";

type Status = "pending" | "watching" | "done";

type WatchItem = {
  id: string;
  tmdbId: number;
  mediaType: TmdbMediaType;
  title: string;
  posterPath?: string | null;
  status: Status;
  season?: number | null;
  episode?: number | null;

  createdByUid?: string | null;
  createdByEmail?: string | null;
  createdByName?: string | null;

  updatedByUid?: string | null;
  updatedByEmail?: string | null;
  updatedByName?: string | null;

  createdAt?: any;
  updatedAt?: any;
};

const img = (path?: string | null) =>
  path ? `https://image.tmdb.org/t/p/w342${path}` : null;

const nameFromEmail = (email?: string | null) =>
  email ? email.split("@")[0] : null;

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();

  const [selected, setSelected] = useState<{
    mediaType: TmdbMediaType;
    tmdbId: number;
  } | null>(null);

  // 2) Buscar en TMDB
  const [qText, setQText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<TmdbSearchItem[]>([]);

  // 3) Detalles
  const [details, setDetails] = useState<TmdbDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // ---------- Firestore ----------
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const q = query(collection(db, "watchlist"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as WatchItem[];

        data.sort((a: any, b: any) => {
          const ta = a?.createdAt?.seconds ?? 0;
          const tb = b?.createdAt?.seconds ?? 0;
          return tb - ta;
        });

        setItems(data);
      },
      (err) => console.error("watchlist onSnapshot error:", err)
    );

    return () => unsub();
  }, [user, authLoading]);

  // ---------- Buscar en TMDB ----------
  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = qText.trim();
    if (!term) return;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const data = await searchMulti(term);
      const filtered = (data.results ?? []).filter(
        (r) => r.media_type === "movie" || r.media_type === "tv"
      );
      setResults(filtered);
    } catch (err: any) {
      setSearchError(err?.message ?? "Error buscando en TMDB");
    } finally {
      setSearchLoading(false);
    }
  }

  // ---------- Ver detalles (TMDB details) ----------
  useEffect(() => {
    if (!selected) {
      setDetails(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const d = await getDetails(selected.mediaType, selected.tmdbId);
        if (!cancelled) setDetails(d);
      } catch (err: any) {
        if (!cancelled)
          setDetailsError(err?.message ?? "Error cargando detalles");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.mediaType, selected?.tmdbId]);

  // ---------- Helpers ----------
  const existingIds = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(`${it.mediaType}:${it.tmdbId}`);
    return s;
  }, [items]);

  async function addToPending(r: TmdbSearchItem) {
    if (!user) {
      alert("No hay sesión activa.");
      return;
    }

    const mediaType = r.media_type as TmdbMediaType;
    if (mediaType !== "movie" && mediaType !== "tv") return;

    const createdName = user.displayName || nameFromEmail(user.email);

    await addDoc(collection(db, "watchlist"), {
      tmdbId: r.id,
      mediaType,
      title: titleOf(r),
      posterPath: r.poster_path ?? null,
      status: "pending",
      season: mediaType === "tv" ? 1 : null,
      episode: mediaType === "tv" ? 1 : null,

      createdByUid: user.uid,
      createdByEmail: user.email ?? null,
      createdByName: createdName ?? null,

      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: createdName ?? null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setSelected({ mediaType, tmdbId: r.id });
  }

  async function setStatus(id: string, status: Status) {
    if (!user) return;

    const updatedName = user.displayName || nameFromEmail(user.email);

    await updateDoc(doc(db, "watchlist", id), {
      status,
      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: updatedName ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  async function updateProgress(id: string, season: number, episode: number) {
    if (!user) return;

    const updatedName = user.displayName || nameFromEmail(user.email);

    await updateDoc(doc(db, "watchlist", id), {
      season,
      episode,
      updatedByUid: user.uid,
      updatedByEmail: user.email ?? null,
      updatedByName: updatedName ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  const pending = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items]
  );
  const watching = useMemo(
    () => items.filter((i) => i.status === "watching"),
    [items]
  );
  const done = useMemo(() => items.filter((i) => i.status === "done"), [items]);

  async function removeItem(id: string, title: string) {
    const ok = window.confirm(`¿Seguro quieres eliminar "${title}"?`);
    if (!ok) return;
    await deleteDoc(doc(db, "watchlist", id));
  }

  // ---------- UI ----------
  return (
    <div className="wlPage">
      {/* CSS responsive local */}
      <style>{`
  .wlPage{
    max-width: 1500px;
    margin: 0 auto;
    padding: 18px;
    display: grid;
    gap: 14px;
  }

  /* DESKTOP: 3 columnas + panel derecho */
  .wlGrid{
    display: grid;
    gap: 14px;
    align-items: start;
    grid-template-columns:
      minmax(320px, 1fr)
      minmax(320px, 1fr)
      minmax(320px, 1fr)
      minmax(420px, 1.2fr);
    grid-template-areas:
      "pending watching done right";
  }

  .area-pending{ grid-area: pending; }
  .area-watching{ grid-area: watching; }
  .area-done{ grid-area: done; }
  .area-right{ grid-area: right; }

  /* Panel derecho: buscar arriba + detalles abajo */
  .rightStack{
    display: grid;
    gap: 14px;
    grid-template-rows: minmax(220px, 38vh) minmax(220px, 36vh);
  }

  /* Scroll solo en desktop/tablet */
  .wlCardScroll{
    max-height: 74vh;
    overflow: auto;
  }

  /* en el panel derecho, cada uno controla su propia altura */
  .wlRightCard{
    overflow: auto;
  }

  /* TABLET: 2 columnas, panel derecho abajo full */
  @media (max-width: 1200px){
    .wlGrid{
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "pending watching"
        "done done"
        "right right";
    }
    .rightStack{
      grid-template-rows: auto auto;
    }
    .wlCardScroll{ max-height: 60vh; }
  }

  /* CELULAR */
  @media (max-width: 650px){
    .wlPage{ padding: 12px; }
    .wlGrid{
      grid-template-columns: 1fr;
      grid-template-areas:
        "right"
        "pending"
        "watching"
        "done";
    }
    .rightStack{
      grid-template-rows: auto auto;
    }
    .wlCardScroll{
      max-height: none;
      overflow: visible;
    }
    .wlResultRow{ grid-template-columns: 1fr; }
    .wlAddBtn{ width: 100%; }
    .wlActions{ flex-wrap: wrap; }
  }

  .wlWrapAnywhere{ overflow-wrap:anywhere; word-break:break-word; }
  .wlTitleClamp{
    display:-webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow:hidden;
  }
`}</style>

      <div>
        <h2 style={{ margin: 0 }}>Watchlist</h2>
        <p style={{ color: "#cbd5e1", marginTop: 6 }}></p>
      </div>

      <div className="wlGrid">
        {/* 1) Pendientes */}
        <section className="area-pending wlCardScroll" style={card}>
          <header style={cardHeader}>
            <strong>Pendientes</strong>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>
              {pending.length}
            </span>
          </header>
          {pending.length === 0 ? (
            <div style={emptyBox}>No hay pendientes.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {pending.map((it) => (
                <ItemRow
                  key={it.id}
                  it={it}
                  selected={selected}
                  setSelected={setSelected}
                  setStatus={setStatus}
                  removeItem={removeItem}
                  updateProgress={updateProgress}
                />
              ))}
            </div>
          )}
        </section>

        <section className="area-watching wlCardScroll" style={card}>
          <header style={cardHeader}>
            <strong>Viendo</strong>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>
              {watching.length}
            </span>
          </header>
          {watching.length === 0 ? (
            <div style={emptyBox}>Nada en “viendo”.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {watching.map((it) => (
                <ItemRow
                  key={it.id}
                  it={it}
                  selected={selected}
                  setSelected={setSelected}
                  setStatus={setStatus}
                  removeItem={removeItem}
                  updateProgress={updateProgress}
                />
              ))}
            </div>
          )}
        </section>

        <section className="area-done wlCardScroll" style={card}>
          <header style={cardHeader}>
            <strong>Vistas</strong>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>
              {done.length}
            </span>
          </header>
          {done.length === 0 ? (
            <div style={emptyBox}>Aún no hay vistas.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {done.map((it) => (
                <ItemRow
                  key={it.id}
                  it={it}
                  selected={selected}
                  setSelected={setSelected}
                  setStatus={setStatus}
                  removeItem={removeItem}
                  updateProgress={updateProgress}
                />
              ))}
            </div>
          )}
        </section>

        {/* 2) Buscar */}
        <section className="area-search wlCardScroll" style={card}>
          <header style={cardHeader}>
            <strong>Buscar Pelicula o Serie</strong>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>TMDB</span>
          </header>

          <form onSubmit={onSearch} style={{ display: "grid", gap: 10 }}>
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Buscar"
              style={input}
            />
            <button
              type="submit"
              style={primaryBtn}
              disabled={!qText.trim() || searchLoading}
            >
              {searchLoading ? "Buscando…" : "Buscar"}
            </button>
          </form>

          {searchError ? <div style={errorBox}>{searchError}</div> : null}

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {results.map((r) => {
              const mediaType = r.media_type as TmdbMediaType;
              const key = `${mediaType}:${r.id}`;
              const already = existingIds.has(key);
              const posterUrl = img(r.poster_path);

              return (
                <div key={key} className="wlResultRow" style={resultRow}>
                  <button
                    onClick={() => setSelected({ mediaType, tmdbId: r.id })}
                    style={resultBtn}
                  >
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt=""
                        style={{
                          width: 44,
                          height: 66,
                          borderRadius: 8,
                          objectFit: "cover",
                          background: "rgba(148,163,184,.08)",
                          flex: "0 0 auto",
                        }}
                        onError={(e) => e.currentTarget.removeAttribute("src")}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 66,
                          borderRadius: 8,
                          background: "rgba(148,163,184,.08)",
                          flex: "0 0 auto",
                        }}
                      />
                    )}

                    <div
                      style={{
                        display: "grid",
                        gap: 4,
                        textAlign: "left",
                        minWidth: 0,
                      }}
                    >
                      <span
                        className="wlTitleClamp"
                        style={{ fontWeight: 600 }}
                      >
                        {titleOf(r)}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {(mediaType === "movie" ? "Película" : "Serie") +
                          (yearOf(r) ? ` • ${yearOf(r)}` : "")}
                      </span>
                    </div>
                  </button>

                  <button
                    className="wlAddBtn"
                    onClick={() => (already ? null : addToPending(r))}
                    disabled={already}
                    style={already ? disabledBtn : addBtn}
                    title={
                      already ? "Ya está en pendientes" : "Agregar a pendientes"
                    }
                  >
                    {already ? "Agregada" : "Agregar"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3) Detalles */}
        <section className="area-details wlCardScroll" style={card}>
          <header style={cardHeader}>
            <strong>Detalles</strong>
            <span style={{ color: "#94a3b8", fontSize: 12 }}></span>
          </header>

          {!selected ? (
            <div style={emptyBox}>
              Haz click en un pendiente o en un resultado para ver detalles.
            </div>
          ) : detailsLoading ? (
            <div style={emptyBox}>Cargando detalles…</div>
          ) : detailsError ? (
            <div style={errorBox}>{detailsError}</div>
          ) : details ? (
            <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                {img(details.poster_path) ? (
                  <img
                    src={img(details.poster_path) ?? undefined}
                    alt=""
                    style={{
                      width: 92,
                      height: 138,
                      borderRadius: 12,
                      objectFit: "cover",
                      background: "rgba(148,163,184,.08)",
                      flex: "0 0 auto",
                    }}
                    onError={(e) => e.currentTarget.removeAttribute("src")}
                  />
                ) : (
                  <div
                    style={{
                      width: 92,
                      height: 138,
                      borderRadius: 12,
                      background: "rgba(148,163,184,.08)",
                      flex: "0 0 auto",
                    }}
                  />
                )}

                <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <h3 className="wlWrapAnywhere" style={{ margin: 0 }}>
                    {titleOf(details)}
                  </h3>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {details.release_date?.slice(0, 4) ||
                      details.first_air_date?.slice(0, 4) ||
                      ""}
                    {details.vote_average
                      ? ` • ⭐ ${details.vote_average.toFixed(1)}`
                      : ""}
                  </div>

                  {details.genres?.length ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {details.genres.slice(0, 4).map((g) => (
                        <span key={g.id} style={chip}>
                          {g.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Info de quién lo agregó (si lo encontramos en items) */}
              {(() => {
                const current = items.find(
                  (x) =>
                    x.tmdbId === selected.tmdbId &&
                    x.mediaType === selected.mediaType
                );
                if (!current?.createdByName && !current?.createdByEmail)
                  return null;
                return (
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    Agregado por:{" "}
                    {current.createdByName ||
                      (current.createdByEmail
                        ? current.createdByEmail.split("@")[0]
                        : "")}
                  </div>
                );
              })()}

              {selected.mediaType === "tv" ? (
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                  {details.number_of_seasons
                    ? `Temporadas: ${details.number_of_seasons}`
                    : ""}
                  {details.number_of_episodes
                    ? ` • Episodios: ${details.number_of_episodes}`
                    : ""}
                </div>
              ) : details.runtime ? (
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                  Duración: {details.runtime} min
                </div>
              ) : null}

              <p
                className="wlWrapAnywhere"
                style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.4 }}
              >
                {details.overview || "Sin sinopsis disponible."}
              </p>
            </div>
          ) : (
            <div style={emptyBox}>Sin detalles.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function ItemRow({
  it,
  selected,
  setSelected,
  setStatus,
  removeItem,
}: {
  it: WatchItem;
  selected: { mediaType: TmdbMediaType; tmdbId: number } | null;
  setSelected: (v: { mediaType: TmdbMediaType; tmdbId: number }) => void;
  setStatus: (id: string, status: Status) => Promise<void>;
  removeItem: (id: string, title: string) => Promise<void>;
  updateProgress: (
    id: string,
    season: number,
    episode: number
  ) => Promise<void>;
}) {
  const isActive =
    selected?.tmdbId === it.tmdbId && selected?.mediaType === it.mediaType;

  const posterUrl = img(it.posterPath);

  return (
    <div style={row}>
      <button
        onClick={() =>
          setSelected({ mediaType: it.mediaType, tmdbId: it.tmdbId })
        }
        style={rowBtn(isActive)}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            style={{
              width: 44,
              height: 66,
              borderRadius: 8,
              objectFit: "cover",
              background: "rgba(148,163,184,.08)",
              flex: "0 0 auto",
            }}
            onError={(e) => e.currentTarget.removeAttribute("src")}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 66,
              borderRadius: 8,
              background: "rgba(148,163,184,.08)",
              flex: "0 0 auto",
            }}
          />
        )}

        <div
          style={{ display: "grid", gap: 4, textAlign: "left", minWidth: 0 }}
        >
          <span className="wlTitleClamp" style={{ fontWeight: 600 }}>
            {it.title}
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {it.mediaType === "movie" ? "Película" : "Serie"}
          </span>

          {it.createdByName || it.createdByEmail ? (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Agregado por:{" "}
              {it.createdByName ||
                (it.createdByEmail ? it.createdByEmail.split("@")[0] : "")}
            </span>
          ) : null}
        </div>
      </button>

      <div
        className="wlActions"
        style={{ display: "flex", gap: 6, alignItems: "center" }}
      >
        {it.status !== "pending" && (
          <button onClick={() => setStatus(it.id, "pending")} style={miniBtn}>
            Pendiente
          </button>
        )}

        {it.status !== "watching" && (
          <button onClick={() => setStatus(it.id, "watching")} style={miniBtn}>
            Viendo
          </button>
        )}

        {it.status !== "done" && (
          <button onClick={() => setStatus(it.id, "done")} style={miniBtn}>
            Visto
          </button>
        )}

        {it.mediaType === "tv" && it.status === "watching" ? (
          <div style={{ display: "flex", gap: 6 }}>
            {/* inputs season/episode como ya los tienes */}
          </div>
        ) : null}

        <button onClick={() => removeItem(it.id, it.title)} style={dangerBtn}>
          ✕
        </button>
      </div>
    </div>
  );
}

/* styles */
const card: React.CSSProperties = {
  border: "2px solid rgba(148,163,184,.2)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(2,6,23,.35)",
  minWidth: 0,
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 10,
  borderBottom: "1px solid rgba(148,163,184,.15)",
  marginBottom: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(15,23,42,.35)",
  color: "#e2e8f0",
  outline: "none",
  fontSize: 16,
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(56,189,248,.15)",
  color: "#e2e8f0",
  cursor: "pointer",
  minHeight: 40,
};

const emptyBox: React.CSSProperties = {
  border: "1px dashed rgba(148,163,184,.25)",
  borderRadius: 12,
  padding: 14,
  color: "#94a3b8",
  background: "rgba(15,23,42,.15)",
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid rgba(248,113,113,.35)",
  background: "rgba(248,113,113,.10)",
  borderRadius: 12,
  padding: 12,
  color: "#fecaca",
  fontSize: 13,
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
  alignItems: "center",
  minWidth: 0,
};

const rowBtn = (active: boolean): React.CSSProperties => ({
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,.2)",
  background: active ? "rgba(56,189,248,.12)" : "rgba(15,23,42,.25)",
  color: "#e2e8f0",
  cursor: "pointer",
  width: "100%",
  minWidth: 0,
});

const miniBtn: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(148,163,184,.08)",
  color: "#e2e8f0",
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid rgba(248,113,113,.35)",
  background: "rgba(248,113,113,.12)",
  color: "#fecaca",
  cursor: "pointer",
};

const resultRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  alignItems: "center",
  border: "1px solid rgba(148,163,184,.15)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(15,23,42,.18)",
  minWidth: 0,
};

const resultBtn: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  border: "none",
  background: "transparent",
  color: "#e2e8f0",
  cursor: "pointer",
  textAlign: "left",
  minWidth: 0,
};

const addBtn: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid rgba(34,197,94,.35)",
  background: "rgba(34,197,94,.12)",
  color: "#bbf7d0",
  cursor: "pointer",
};

const disabledBtn: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(148,163,184,.08)",
  color: "#94a3b8",
  cursor: "not-allowed",
};

const chip: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(148,163,184,.08)",
  color: "#e2e8f0",
  fontSize: 12,
};
