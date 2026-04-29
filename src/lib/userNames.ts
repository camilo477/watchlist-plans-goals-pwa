const EMAIL_TO_NAME: Record<string, string> = {
  "camilo_vito@yahoo.es": "camilo",
  "camilo@prueba.com": "camilo",
  "diana@prueba.com": "diana",
};

export function nameFromEmail(email?: string | null) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return EMAIL_TO_NAME[normalized] ?? normalized.split("@")[0];
}
