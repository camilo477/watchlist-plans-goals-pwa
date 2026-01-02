import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const topLinkStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 12px",
  borderRadius: 999,
  textDecoration: "none",
  color: active ? "white" : "#cbd5e1",
  background: active ? "rgba(51,65,85,.9)" : "transparent",
  border: active ? "1px solid rgba(148,163,184,.25)" : "1px solid transparent",
  whiteSpace: "nowrap",
});

export default function HomeLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  async function logout() {
    await signOut(auth);
    nav("/login", { replace: true });
  }

  const is = (p: string) => pathname.startsWith(p);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1500,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <style>{`
        .topbar{
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(11,18,32,.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(31,41,55,1);
        }

        .topbarInner{
          width: 100%;
          padding: 12px 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }

        .brand{
          font-weight: 800;
          letter-spacing: .2px;
          line-height: 1;
        }

        .logoutBtn{
          padding: 9px 12px;
          border-radius: 12px;
          border: 1px solid rgba(31,41,55,1);
          background: rgba(17,24,39,1);
          color: white;
          cursor: pointer;
          white-space: nowrap;
        }

        .main{
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 12px;
          padding-bottom: 84px; /* espacio para bottom nav en móvil */
        }

        /* Top nav (solo desktop/tablet) */
        .topNav{
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 12px 12px;
          display:flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Bottom nav (solo móvil) */
        .bottomNav{
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          padding: 10px 10px 12px;
          background: rgba(11,18,32,.92);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(31,41,55,1);
        }

        .bottomNavInner{
          display:grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px;
          max-width: 700px;
          margin: 0 auto;
        }

        .bItem{
          display:flex;
          flex-direction: column;
          align-items:center;
          justify-content:center;
          gap: 4px;
          text-decoration:none;
          border-radius: 14px;
          padding: 10px 8px;
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(15,23,42,.35);
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1;
        }

        .bItemActive{
          background: rgba(51,65,85,.9);
          border-color: rgba(148,163,184,.25);
          color: white;
        }

        .bIcon{
          font-size: 16px;
          line-height: 1;
        }

        /* Mostrar topNav en pantallas grandes */
        @media (min-width: 800px){
          .main{ padding-bottom: 16px; }
          .bottomNav{ display: none; }
        }

        /* Ocultar topNav en móvil */
        @media (max-width: 799px){
          .topNav{ display: none; }
        }
      `}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">DianiMilo</div>
          <button onClick={logout} className="logoutBtn">
            Salir
          </button>
        </div>

        {/* Top nav para desktop/tablet */}
        <nav className="topNav">
          <Link to="/watchlist" style={topLinkStyle(is("/watchlist"))}>
            Watchlist
          </Link>
          <Link to="/planes" style={topLinkStyle(is("/planes"))}>
            Planes
          </Link>
          <Link to="/metas" style={topLinkStyle(is("/metas"))}>
            Metas
          </Link>
          <Link to="/ruleta" style={topLinkStyle(is("/ruleta"))}>
            Ruleta
          </Link>
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      {/* Bottom nav para móvil */}
      <div className="bottomNav">
        <div className="bottomNavInner">
          <Link
            to="/watchlist"
            className={`bItem ${is("/watchlist") ? "bItemActive" : ""}`}
          >
            <span className="bIcon"></span>
            Watchlist
          </Link>
          <Link
            to="/planes"
            className={`bItem ${is("/planes") ? "bItemActive" : ""}`}
          >
            <span className="bIcon"></span>
            Planes
          </Link>
          <Link
            to="/metas"
            className={`bItem ${is("/metas") ? "bItemActive" : ""}`}
          >
            <span className="bIcon"></span>
            Metas
          </Link>
          <Link
            to="/ruleta"
            className={`bItem ${is("/ruleta") ? "bItemActive" : ""}`}
          >
            <span className="bIcon"></span>
            Ruleta
          </Link>
        </div>
      </div>
    </div>
  );
}
