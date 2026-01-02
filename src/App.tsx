import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomeLayout from "./pages/HomeLayout";
import WatchlistPage from "./pages/WatchlistPage";
import PlansPage from "./pages/PlansPage";
import GoalsPage from "./pages/GoalsPage";
import RoulettePage from "./pages/RoulettePage";

import RequireAuth from "./auth/RequireAuth";
import { AuthProvider } from "./auth/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomeLayout />}>
            <Route index element={<Navigate to="/watchlist" replace />} />
            <Route path="watchlist" element={<WatchlistPage />} />
            <Route path="planes" element={<PlansPage />} />
            <Route path="metas" element={<GoalsPage />} />
            <Route path="ruleta" element={<RoulettePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
