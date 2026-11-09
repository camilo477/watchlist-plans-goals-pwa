export function nameFromEmail(email?: string | null) {
  if (!email) return null;
  return email.trim().toLowerCase().split("@")[0];
}
