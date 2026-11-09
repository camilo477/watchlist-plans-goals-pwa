export const isDemoOnly = import.meta.env.VITE_DEMO_ONLY === "true";
export const isDemoMode = isDemoOnly || new URLSearchParams(window.location.search).get("demo") === "1";
export const demoUser = { uid: "portfolio-visitor", email: "alex@example.com", displayName: "Alex" };
export const demoAnniversary = "2024-05-18T12:00:00-05:00";

export function demoUrl(enabled = true) {
  const url = new URL(window.location.href);
  if (enabled) url.searchParams.set("demo", "1");
  else url.searchParams.delete("demo");
  url.hash = enabled ? "/" : "/login";
  return url.toString();
}
