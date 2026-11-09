import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, missingFirebaseConfig } from "../lib/firebase";

import { isDemoMode, demoUser } from "../lib/demo";

type AuthCtx = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(isDemoMode ? demoUser as User : null);
  const [loading, setLoading] = useState(!isDemoMode && missingFirebaseConfig.length === 0);

  useEffect(() => {
    if (isDemoMode || missingFirebaseConfig.length > 0) return;

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
