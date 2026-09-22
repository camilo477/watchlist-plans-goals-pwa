import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { user, loading: authLoading } = useAuth();

  const from = useMemo(
    () => loc?.state?.from || "/",
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
      if (!username.trim() || !pass) {
        setErr("Escribe el usuario y la contraseña.");
        return;
      }

      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: pass }),
      });
      const data = (await response.json()) as { customToken?: string; message?: string };
      if (!response.ok || !data.customToken) {
        setErr(data.message || "No se pudo iniciar sesión.");
        return;
      }

      await signInWithCustomToken(auth, data.customToken);
      nav(from, { replace: true });
    } catch (e: any) {
      setErr("No se pudo conectar con el servidor.");
      console.error("Login error:", e);
    } finally {
      setLoading(false);
    }
  }

  const input: React.CSSProperties = {
    padding: "11px 12px",
    borderRadius: 14,
    border: "2px solid var(--app-border-strong)",
    background: "rgba(255,248,232,.86)",
    color: "var(--app-text)",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  const btn: React.CSSProperties = {
    padding: "11px 12px",
    borderRadius: 14,
    border: "2px solid var(--app-border-strong)",
    background: "#ffe08f",
    color: "var(--app-ink)",
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
          border-radius: 22px;
          border: 3px solid var(--app-border-strong);
          background: var(--app-surface);
          box-shadow: var(--app-shadow);
          box-sizing: border-box;
          position: relative;
        }

        .loginCard::before{
          content: "";
          position: absolute;
          width: 92px;
          height: 28px;
          top: -15px;
          left: 28px;
          border-radius: 5px;
          border: 2px solid rgba(102,66,45,.16);
          background: rgba(158,216,209,.68);
          transform: rotate(-4deg);
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
