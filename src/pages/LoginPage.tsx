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

  // Si ya está logueado, lo mandamos al destino (cuando auth termine de cargar)
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
      // firebase suele enviar códigos tipo auth/invalid-credential
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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        color: "white",
        padding: 16,
      }}
    >
      <div
        style={{
          width: 360,
          maxWidth: "100%",
          padding: 16,
          borderRadius: 16,
          border: "1px solid #1f2937",
          background: "rgba(17, 24, 39, 0.25)",
          boxSizing: "border-box",
        }}
      >
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

          {/* Opcional debug:
          <div style={{ color: "#94a3b8", fontSize: 12 }}>
            Email: {USER_TO_EMAIL[normalizeUser(username)] || "—"}
          </div>
          */}

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
