import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../auth/AuthProvider";
import { auth } from "../lib/firebase";
import { nameFromEmail } from "../lib/userNames";

const topLinkStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 14px",
  borderRadius: "14px 14px 8px 8px",
  textDecoration: "none",
  color: active ? "var(--app-ink)" : "var(--app-muted)",
  background: active ? "var(--app-paper)" : "rgba(255,248,232,.55)",
  border: active
    ? "2px solid var(--app-border-strong)"
    : "2px solid rgba(102,66,45,.22)",
  borderBottomColor: active ? "var(--app-paper)" : "rgba(102,66,45,.22)",
  boxShadow: active
    ? "0 5px 0 rgba(85,54,38,.12)"
    : "0 3px 0 rgba(85,54,38,.08)",
  whiteSpace: "nowrap",
  transform: active ? "translateY(2px) rotate(-.5deg)" : "rotate(.4deg)",
  fontWeight: 900,
});

const navItems = [
  { to: "/watchlist", label: "Peliculas", short: "Pelis", icon: "*" },
  { to: "/planes", label: "Planes", short: "Planes", icon: "+" },
  { to: "/metas", label: "Metas", short: "Metas", icon: "v" },
  { to: "/ruleta", label: "Ruleta", short: "Ruleta", icon: "?" },
  { to: "/tamagotchi", label: "Tamagotchi", short: "Tama", icon: "o" },
];

export default function HomeLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const displayName =
    user?.displayName || nameFromEmail(user?.email) || "Usuario";

  async function logout() {
    await Promise.allSettled([
      signOut(auth),
      fetch("/api/logout", { method: "POST", credentials: "same-origin" }),
    ]);
    nav("/login", { replace: true });
  }

  const is = (p: string) => pathname.startsWith(p);

  return (
    <div
      className="memoryShell"
      style={{
        width: "100%",
        margin: "0 auto",
        minHeight: "100dvh",
        color: "var(--app-text)",
      }}
    >
      <style>{`
        .memoryShell{
          position: relative;
          overflow: hidden;
        }

        .memoryShell::before,
        .memoryShell::after{
          content: "";
          position: fixed;
          z-index: 0;
          pointer-events: none;
          opacity: .75;
        }

        .memoryShell::before{
          width: 180px;
          height: 180px;
          right: -58px;
          top: 92px;
          background:
            radial-gradient(circle at 50% 28%, transparent 0 26px, rgba(91,63,50,.18) 27px 30px, transparent 31px),
            radial-gradient(circle at 50% 67%, rgba(184,217,156,.72) 0 58px, transparent 59px);
          border-radius: 48% 52% 54% 46%;
          transform: rotate(16deg);
        }

        .memoryShell::after{
          width: 140px;
          height: 86px;
          left: -38px;
          bottom: 92px;
          border: 3px solid rgba(102,66,45,.24);
          border-radius: 52% 48% 45% 55%;
          background: rgba(246,195,95,.28);
          transform: rotate(-10deg);
        }

        .topbar{
          position: sticky;
          top: 0;
          z-index: 50;
          background:
            linear-gradient(180deg, rgba(255,248,232,.96), rgba(247,223,185,.92)),
            var(--app-paper);
          border-bottom: 3px solid var(--app-border-strong);
          box-shadow: 0 7px 0 rgba(91,63,50,.08);
        }

        .topbarInner{
          width: 100%;
          max-width: 1260px;
          margin: 0 auto;
          padding: 14px 18px 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }

        .brand{
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1;
          display:flex;
          align-items:center;
          gap: 9px;
          color: var(--app-ink);
          text-shadow: 0 1px 0 rgba(255,255,255,.55);
        }

        .brandMark{
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display:grid;
          place-items:center;
          color: var(--app-ink);
          background:
            radial-gradient(circle at 30% 26%, rgba(255,248,232,.72) 0 5px, transparent 6px),
            linear-gradient(135deg, #ffd16f, #f28f70);
          border: 2px solid var(--app-border-strong);
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 4px 0 rgba(85,54,38,.2);
          transform: rotate(-4deg);
        }

        .logoutBtn{
          padding: 9px 13px;
          border-radius: 14px;
          border: 2px solid var(--app-border-strong);
          background: #ffe08f;
          color: var(--app-ink);
          cursor: pointer;
          white-space: nowrap;
          font-weight: 900;
        }

        .sessionBox{
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap: 9px;
          min-width: 0;
        }

        .sessionName{
          min-width: 0;
          max-width: 210px;
          padding: 8px 11px;
          border-radius: 999px;
          border: 2px dashed rgba(102,66,45,.35);
          background: rgba(255,248,232,.76);
          color: var(--app-ink);
          font-size: 13px;
          font-weight: 800;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .main{
          position: relative;
          z-index: 1;
          max-width: 1260px;
          margin: 0 auto;
          padding: 26px 18px 92px;
        }

        .topNav{
          max-width: 1260px;
          margin: 0 auto;
          padding: 0 18px;
          display:flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items:flex-end;
        }

        .bottomNav{
          position: fixed;
          left: 10px;
          right: 10px;
          bottom: max(12px, env(safe-area-inset-bottom));
          z-index: 60;
          max-width: 720px;
          margin: 0 auto;
          padding: 8px 10px;
          background: rgba(255,248,232,.94);
          border: 3px solid var(--app-border-strong);
          border-radius: 20px;
          box-shadow: 0 8px 0 rgba(91,63,50,.12), 0 16px 30px rgba(91,63,50,.18);
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
          border-radius: 16px;
          padding: 9px 4px;
          border: 2px solid rgba(102,66,45,.22);
          color: var(--app-muted);
          font-size: 11px;
          line-height: 1;
          min-width: 0;
          background: rgba(247,223,185,.62);
          font-weight: 900;
        }

        .bItemActive{
          background: #fff8e8;
          border-color: var(--app-border-strong);
          color: var(--app-ink);
          transform: translateY(-2px) rotate(-1deg);
        }

        .bIcon{
          width: 25px;
          height: 25px;
          border-radius: 10px;
          display:grid;
          place-items:center;
          background: #f6c35f;
          border: 2px solid rgba(85,54,38,.38);
          color: var(--app-ink);
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
        }

        .memoryBook{
          position: relative;
          border: 3px solid var(--app-border-strong);
          border-radius: 22px;
          background:
            linear-gradient(90deg, rgba(91,63,50,.08) 0 16px, transparent 17px),
            linear-gradient(180deg, rgba(255,248,232,.96), rgba(255,248,232,.82));
          box-shadow: var(--app-shadow);
          min-height: calc(100dvh - 172px);
          padding: 22px;
        }

        .memoryBook::before{
          content: "";
          position: absolute;
          left: 26px;
          top: 18px;
          bottom: 18px;
          width: 2px;
          background: repeating-linear-gradient(
            to bottom,
            rgba(91,63,50,.18) 0 10px,
            transparent 10px 20px
          );
        }

        .sticker{
          position: absolute;
          z-index: 2;
          border: 2px solid var(--app-border-strong);
          box-shadow: 0 4px 0 rgba(85,54,38,.16);
          pointer-events: none;
        }

        .stickerDot{
          right: 24px;
          top: -17px;
          width: 43px;
          height: 43px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 50%, #5b3f32 0 2px, transparent 3px),
            radial-gradient(circle at 36% 38%, #5b3f32 0 3px, transparent 4px),
            radial-gradient(circle at 64% 38%, #5b3f32 0 3px, transparent 4px),
            #f6b6ad;
          transform: rotate(8deg);
        }

        .stickerTape{
          left: min(18vw, 190px);
          top: -15px;
          width: 96px;
          height: 28px;
          border-color: rgba(102,66,45,.18);
          border-radius: 5px;
          background: rgba(158,216,209,.62);
          transform: rotate(-3deg);
        }

        @media (min-width: 800px){
          .main{ padding-bottom: 24px; }
          .bottomNav{ display: none; }
        }

        @media (max-width: 799px){
          .topNav{ display: none; }
          .topbarInner{ padding: 12px 14px; }
          .main{ padding: 16px 12px 136px; }
          .memoryBook{
            min-height: calc(100dvh - 150px);
            padding: 18px 14px 18px 18px;
            border-radius: 18px;
          }
          .memoryBook::before{ left: 14px; }
          .brand span:last-child{ display: none; }
          .sessionBox{ gap: 7px; }
          .sessionName{
            max-width: min(42vw, 170px);
            padding: 8px 9px;
            font-size: 12px;
          }
          .logoutBtn{ padding: 8px 10px; }
        }
      `}</style>

      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <span className="brandMark">DM</span>
            <span>DianiMilo</span>
          </div>
          <div className="sessionBox" aria-label="Sesion actual">
            <div className="sessionName" title={displayName}>
              {displayName}
            </div>
            <button onClick={logout} className="logoutBtn">
              Salir
            </button>
          </div>
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
        <section className="memoryBook" aria-label="Album compartido">
          <span className="sticker stickerTape" aria-hidden="true" />
          <span className="sticker stickerDot" aria-hidden="true" />
          <Outlet />
        </section>
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
