type Data = Record<string, any>;
type State = Record<string, Record<string, Data>>;
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
export const DEMO_STORAGE_KEY = "dianimilo-portfolio-demo-v1";

export const demoMovies = [
  { id: 900001, media_type: "movie" as const, title: "Bajo las estrellas", overview: "Dos viajeros descubren un pequeño observatorio y una nueva forma de mirar el mundo.", release_date: "2025-06-14", poster_path: null },
  { id: 900002, media_type: "movie" as const, title: "Un verano en ruta", overview: "Una comedia de aventuras sobre un viaje sin mapa y los encuentros del camino.", release_date: "2024-08-02", poster_path: null },
  { id: 900003, media_type: "tv" as const, name: "Café de domingo", overview: "Historias de amistad y pequeños sueños en un café de barrio.", first_air_date: "2025-03-09", poster_path: null },
];

function initialState(): State {
  return {
    plans: {
      picnic: { title: "Picnic al atardecer", description: "Preparar algo rico y encontrar un parque tranquilo.", status: "planned", sort: 1, links: [], createdByName: "Sam" },
      museum: { title: "Conocer un museo", description: "Elegir una exposición para el próximo fin de semana.", status: "idea", sort: 2, links: [], createdByName: "Alex" },
      dinner: { title: "Cocinar una receta nueva", description: "La primera pasta casera salió muy bien.", status: "done", sort: 3, links: [], createdByName: "Sam" },
    },
    goals: {
      trip: { title: "Nuestro próximo viaje", description: "Ahorrar para una escapada a la montaña.", status: "active", priority: "high", order: 2, progress: { money: { currency: "COP", targetAmount: 1200000, currentAmount: 450000 } }, createdByName: "Alex" },
      garden: { title: "Crear un pequeño jardín", description: "Un rincón verde para compartir.", status: "active", priority: "medium", order: 1, progress: { checklist: { items: [{ id: "pots", text: "Elegir las macetas", done: true }, { id: "seeds", text: "Comprar semillas", done: false }] } }, createdByName: "Sam" },
    },
    watchlist: Object.fromEntries(demoMovies.map((movie, index) => [String(movie.id), { tmdbId: movie.id, mediaType: movie.media_type, title: movie.title ?? movie.name, posterPath: null, status: index === 2 ? "watching" : "pending", season: movie.media_type === "tv" ? 1 : null, episode: movie.media_type === "tv" ? 3 : null, createdAt: { seconds: 1700000000 + index }, createdByName: "Alex" }])),
    tamagotchi: {},
  };
}

// A separate store for this tab. It never imports Firebase or makes a request.
export class DemoStore {
  private state: State;
  private listeners = new Set<() => void>();
  private storage?: Storage;
  constructor(storage?: Storage) {
    this.storage = storage;
    this.state = initialState();
    try {
      const saved = storage?.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && ["plans", "goals", "watchlist", "tamagotchi"].every(key => parsed[key] && typeof parsed[key] === "object")) this.state = parsed;
      }
    } catch { /* Browsers may disable storage; the in-memory demo still works. */ }
  }
  list(name: string, sort?: { field: string; direction: string }) {
    const entries = Object.entries(this.state[name] ?? {});
    if (sort) entries.sort(([, a], [, b]) => (a[sort.field] > b[sort.field] ? 1 : a[sort.field] < b[sort.field] ? -1 : 0) * (sort.direction === "desc" ? -1 : 1));
    return entries.map(([id, value]) => ({ id, data: () => structuredClone(value) }));
  }
  get(name: string, id: string) { return this.state[name]?.[id] ? structuredClone(this.state[name][id]) : undefined; }
  put(name: string, id: string, value: Data, merge = false) {
    this.state[name] ??= {};
    this.state[name][id] = structuredClone(merge ? { ...this.state[name][id], ...value } : value);
    this.changed();
  }
  remove(name: string, id: string) { delete this.state[name]?.[id]; this.changed(); }
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    queueMicrotask(() => { if (this.listeners.has(callback)) callback(); });
    return () => { this.listeners.delete(callback); };
  }
  reset() { this.state = initialState(); this.changed(); }
  private changed() {
    try { this.storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(this.state)); } catch { /* Keep working in memory. */ }
    for (const listener of this.listeners) listener();
  }
}
