import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
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

    const unsub = onAuthStateChanged(auth, (u) => {
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
            border: "1px solid var(--app-border)",
            borderRadius: 8,
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
              background: "rgba(16,17,15,.72)",
              border: "1px solid var(--app-border)",
              borderRadius: 8,
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
