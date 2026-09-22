export type AppIconName = "heart" | "film" | "plans" | "goals" | "shuffle" | "cat" | "arrow";

const paths: Record<AppIconName, string> = {
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  film: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M7 12h10",
  plans: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 15l3 3 5-5",
  goals: "M21 12a9 9 0 1 1-9-9M16 3h5v5M21 3l-9 9M16 12a4 4 0 1 1-4-4",
  shuffle: "M3 5h3c5 0 7 14 12 14h3M17 15l4 4-4 4M3 19h3c1.5 0 2.7-1.2 4-3M14 8c1.3-1.8 2.5-3 4-3h3M17 1l4 4-4 4",
  cat: "M4 10 3 3l6 4a12 12 0 0 1 6 0l6-4-1 7a7 7 0 0 1-8 11 7 7 0 0 1-8-11ZM8 12h.01M16 12h.01M11 16h2M12 16v2M1 14l5 1M23 14l-5 1",
  arrow: "M4 12h16M14 6l6 6-6 6",
};

export default function AppIcon({ name, size = 22 }: { name: AppIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
