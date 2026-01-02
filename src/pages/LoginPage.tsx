import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

const USER_TO_EMAIL: Record<string, string> = {
  camilo: "camilo@prueba.com",
  diana: "diana@prueba.com",
};

function normalizeUser(u: string) {
  return u.trim().toLowerCase();
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
      const u = normalizeUser(username);
      const email = USER_TO_EMAIL[u];

      if (!email) {
        setErr("Usuario no permitido. Usa: camilo o diana.");
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
    padding: 10,
    borderRadius: 12,
    border: "1px solid #1f2937",
    background: "#0b1220",
    color: "white",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  const btn: React.CSSProperties = {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #1f2937",
    background: "#111827",
    color: "white",
    width: "100%",
    cursor: "pointer",
    fontWeight: 600,
    opacity: loading || authLoading ? 0.7 : 1,
  };

  return (
    <div className="loginWrap">
      <style>{`
        html, body, #root { height: 100%; background: #0b1220; }
        body { margin: 0; }

        /* Evita el “descentrado” por la barra del navegador (móvil) */
        .loginWrap{
          min-height: 100vh;
          min-height: 100svh; /* viewport estable (móvil) */
          min-height: 100dvh; /* viewport real (móvil) */
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b1220;
          color: white;

          /* safe-area (notch) */
          padding-top: max(16px, env(safe-area-inset-top));
          padding-right: max(16px, env(safe-area-inset-right));
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          padding-left: max(16px, env(safe-area-inset-left));
          box-sizing: border-box;
        }

        .loginCard{
          width: min(360px, 100%);
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #1f2937;
          background: rgba(17, 24, 39, 0.25);
          box-sizing: border-box;
        }

        /* Cuando el teclado abre y queda poco alto, mejor alinear arriba */
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
        <h2 style={{ marginTop: 0 }}>Iniciar sesión</h2>
        <p style={{ color: "#cbd5e1", marginTop: 6 }}>
          Usuario: <b>camilo</b> o <b>diana</b>
        </p>

        <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario (camilo / diana)"
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
            <div style={{ color: "#fca5a5", fontSize: 13 }}>{err}</div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
