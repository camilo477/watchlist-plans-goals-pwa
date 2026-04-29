import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const topLinkStyle = (active: boolean): React.CSSProperties => ({
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: active ? "var(--app-text)" : "var(--app-muted)",
  background: active ? "rgba(125,211,176,.14)" : "transparent",
  border: active
    ? "1px solid rgba(125,211,176,.32)"
    : "1px solid transparent",
  whiteSpace: "nowrap",
});

const navItems = [
  { to: "/watchlist", label: "Watchlist", short: "Watch", icon: "L" },
  { to: "/planes", label: "Planes", short: "Planes", icon: "P" },
  { to: "/metas", label: "Metas", short: "Metas", icon: "M" },
  { to: "/ruleta", label: "Ruleta", short: "Ruleta", icon: "R" },
  { to: "/tamagotchi", label: "Tamagotchi", short: "Tama", icon: "T" },
];

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
        margin: "0 auto",
        minHeight: "100dvh",
        color: "var(--app-text)",
      }}
    >
      <style>{`
        .topbar{
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(16,17,15,.88);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--app-border);
        }

        .topbarInner{
          width: 100%;
          max-width: 1260px;
          margin: 0 auto;
          padding: 14px 18px 10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }

        .brand{
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1;
          display:flex;
          align-items:center;
          gap: 9px;
        }

        .brandMark{
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display:grid;
          place-items:center;
          color: #111714;
          background: linear-gradient(135deg, var(--app-accent), var(--app-accent-2));
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 10px 24px rgba(0,0,0,.28);
        }

        .logoutBtn{
          padding: 9px 13px;
          border-radius: 8px;
          border: 1px solid var(--app-border);
          background: var(--app-surface-2);
          color: var(--app-text);
          cursor: pointer;
          white-space: nowrap;
        }

        .main{
          max-width: 1260px;
          margin: 0 auto;
          padding: 22px 18px 92px;
        }

        .topNav{
          max-width: 1260px;
          margin: 0 auto;
          padding: 0 18px 12px;
          display:flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .bottomNav{
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          padding: 8px 10px max(10px, env(safe-area-inset-bottom));
          background: rgba(16,17,15,.9);
          backdrop-filter: blur(16px);
          border-top: 1px solid var(--app-border);
        }

        .bottomNavInner{
          display:grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 8px;
          max-width: 700px;
          margin: 0 auto;
        }

        .bItem{
          display:flex;
          flex-direction: column;
          align-items:center;
          justify-content:center;
          gap: 5px;
          text-decoration:none;
          border-radius: 8px;
          padding: 9px 4px;
          border: 1px solid transparent;
          color: var(--app-muted);
          font-size: 11px;
          line-height: 1;
          min-width: 0;
        }

        .bItemActive{
          background: rgba(125,211,176,.14);
          border-color: rgba(125,211,176,.28);
          color: var(--app-text);
        }

        .bIcon{
          width: 23px;
          height: 23px;
          border-radius: 7px;
          display:grid;
          place-items:center;
          background: rgba(244,240,232,.08);
          color: var(--app-accent);
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        @media (min-width: 800px){
          .main{ padding-bottom: 24px; }
          .bottomNav{ display: none; }
        }

        @media (max-width: 799px){
          .topNav{ display: none; }
          .topbarInner{ padding: 12px 14px; }
          .main{ padding: 16px 12px 92px; }
        }
      `}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <span className="brandMark">DM</span>
            <span>DianiMilo</span>
          </div>
          <button onClick={logout} className="logoutBtn">
            Salir
          </button>
        </div>

        <nav className="topNav">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} style={topLinkStyle(is(item.to))}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <div className="bottomNav">
        <div className="bottomNavInner">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`bItem ${is(item.to) ? "bItemActive" : ""}`}
            >
              <span className="bIcon">{item.icon}</span>
              {item.short}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
