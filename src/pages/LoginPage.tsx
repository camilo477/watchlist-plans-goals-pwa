import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

const USER_TO_EMAIL: Record<string, string> = {
  camilo: "camilo_vito@yahoo.es",
  diana: "diana@prueba.com",
};

function normalizeUser(u: string) {
  return u.trim().toLowerCase();
}

function resolveLoginEmail(value: string) {
  const normalized = normalizeUser(value);
  if (normalized.includes("@")) return normalized;
  return USER_TO_EMAIL[normalized] ?? null;
}

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { user, loading: authLoading } = useAuth();

  const from = useMemo(
    () => loc?.state?.from || "/watchlist",
    [loc?.state?.from]
  );

  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      nav(from, { replace: true });
    }
  }, [authLoading, user, from, nav]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const email = resolveLoginEmail(username);

      if (!email) {
        setErr("Usa camilo, diana o tu correo.");
        return;
      }

      if (!pass) {
        setErr("Escribe la contraseña.");
        return;
      }

      await signInWithEmailAndPassword(auth, email, pass);
      nav(from, { replace: true });
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password"
      ) {
        setErr("Contraseña incorrecta.");
      } else if (code === "auth/user-not-found") {
        setErr("Ese usuario no existe en Firebase Auth.");
      } else if (code === "auth/too-many-requests") {
        setErr("Demasiados intentos. Espera un momento y prueba de nuevo.");
      } else {
        setErr("No se pudo iniciar sesión. Revisa Firebase Auth y el correo.");
        console.error("Login error:", e);
      }
    } finally {
      setLoading(false);
    }
  }

  const input: React.CSSProperties = {
    padding: "11px 12px",
    borderRadius: 8,
    border: "1px solid var(--app-border-strong)",
    background: "rgba(16,17,15,.72)",
    color: "var(--app-text)",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  const btn: React.CSSProperties = {
    padding: "11px 12px",
    borderRadius: 8,
    border: "1px solid rgba(125,211,176,.35)",
    background: "rgba(125,211,176,.18)",
    color: "var(--app-text)",
    width: "100%",
    cursor: "pointer",
    fontWeight: 800,
    opacity: loading || authLoading ? 0.7 : 1,
  };

  return (
    <div className="loginWrap">
      <style>{`
        html, body, #root { min-height: 100%; }
        body { margin: 0; }

        .loginWrap{
          min-height: 100vh;
          min-height: 100svh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--app-text);

          padding-top: max(16px, env(safe-area-inset-top));
          padding-right: max(16px, env(safe-area-inset-right));
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          padding-left: max(16px, env(safe-area-inset-left));
          box-sizing: border-box;
        }

        .loginCard{
          width: min(380px, 100%);
          padding: 20px;
          border-radius: 10px;
          border: 1px solid var(--app-border);
          background: var(--app-surface);
          box-shadow: var(--app-shadow);
          box-sizing: border-box;
        }

        @media (max-height: 520px){
          .loginWrap{
            align-items: flex-start;
          }
          .loginCard{
            margin-top: 12px;
          }
        }
      `}</style>

      <div className="loginCard">
        <h2 style={{ margin: 0 }}>Iniciar sesión</h2>
        <p style={{ color: "var(--app-muted)", marginTop: 6 }}>
          Usuario: <b>camilo</b>, <b>diana</b> o tu correo
        </p>

        <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario o correo"
            style={input}
            autoComplete="username"
            disabled={loading || authLoading}
          />

          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Contraseña"
            type="password"
            style={input}
            autoComplete="current-password"
            disabled={loading || authLoading}
          />

          <button disabled={loading || authLoading} style={btn} type="submit">
            {authLoading ? "Cargando…" : loading ? "Entrando…" : "Entrar"}
          </button>

          {err ? (
            <div style={{ color: "var(--app-danger)", fontSize: 13 }}>
              {err}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
