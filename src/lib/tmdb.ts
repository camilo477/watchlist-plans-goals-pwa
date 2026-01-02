const TMDB_BASE = "https://api.themoviedb.org/3";

export type TmdbMediaType = "movie" | "tv";

export type TmdbSearchItem = {
  id: number;
  media_type?: TmdbMediaType; // a veces viene en multi
  title?: string; // movie
  name?: string; // tv
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string; // movie
  first_air_date?: string; // tv
};

export type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  runtime?: number; // movie
  number_of_seasons?: number; // tv
  number_of_episodes?: number; // tv
  release_date?: string;
  first_air_date?: string;
};

function getKey() {
  const key = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  if (!key) throw new Error("Falta VITE_TMDB_API_KEY en .env");
  return key;
}

async function tmdbFetch<T>(path: string, params?: Record<string, string>) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", getKey());
  url.searchParams.set("language", "es-CO");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMDB error ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function searchMulti(query: string) {
  return tmdbFetch<{ results: TmdbSearchItem[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
}

export async function getDetails(mediaType: TmdbMediaType, id: number) {
  return tmdbFetch<TmdbDetails>(`/${mediaType}/${id}`);
}

export function titleOf(item: { title?: string; name?: string }) {
  return item.title ?? item.name ?? "Sin título";
}

export function yearOf(item: { release_date?: string; first_air_date?: string }) {
  const d = item.release_date ?? item.first_air_date;
  return d ? d.slice(0, 4) : "";
}
