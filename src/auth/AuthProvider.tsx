import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, missingFirebaseConfig } from "../lib/firebase";

type AuthCtx = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(missingFirebaseConfig.length === 0);

  useEffect(() => {
    if (missingFirebaseConfig.length > 0) return;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const response = await fetch("/api/session/touch", {
            method: "POST",
            credentials: "same-origin",
          });
          if (response.status === 401) {
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
        } catch {
          // Conserva el acceso offline; se validará al recuperar conexión.
        }
      }
      setUser(u ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (missingFirebaseConfig.length > 0) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 18,
          color: "var(--app-text)",
        }}
      >
        <div
          style={{
            width: "min(520px, 100%)",
            border: "3px solid var(--app-border-strong)",
            borderRadius: 22,
            background: "var(--app-surface)",
            boxShadow: "var(--app-shadow)",
            padding: 18,
          }}
        >
          <h2 style={{ margin: 0 }}>Falta configurar Firebase</h2>
          <p style={{ color: "var(--app-muted)", marginBottom: 12 }}>
            Completa tu archivo <code>.env</code> y reinicia Vite.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "rgba(255,248,232,.86)",
              border: "2px dashed var(--app-border)",
              borderRadius: 14,
              padding: 12,
              color: "var(--app-text)",
              margin: 0,
            }}
          >
            {missingFirebaseConfig.join("\n")}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return ctx;
}
