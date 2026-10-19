import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const port = Number(process.env.PORT || 8080);
const publicDir = resolve("dist");
const dataDir = resolve(process.env.DIAMILO_DATA_DIR || "data");
const stateFile = join(dataDir, "security.json");
const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const securityToken = process.env.DIAMILO_SECURITY_TOKEN || "";
const cookieName = "diamilo_session";
const sessionDurationMs = Number(process.env.DIAMILO_SESSION_DURATION_MS || 7 * 24 * 60 * 60 * 1000);
const attemptWindowMs = Number(process.env.DIAMILO_AUTH_WINDOW_MS || 15 * 60 * 1000);
const lockDurationMs = Number(process.env.DIAMILO_AUTH_BLOCK_MS || 15 * 60 * 1000);
const maxAttempts = Number(process.env.DIAMILO_AUTH_MAX_ATTEMPTS || 5);
const maxEvents = 200;

const aliases = {
  camilo: "camilo_vito@yahoo.es",
  diana: "dianaquiroga03@hotmail.com",
};

mkdirSync(dataDir, { recursive: true });

if (runCommand()) process.exit();

if (!firebaseApiKey || !securityToken) {
  console.error("FIREBASE_API_KEY y DIAMILO_SECURITY_TOKEN son obligatorias.");
  process.exit(1);
}

const adminAuth = getAuth(initializeApp({ credential: applicationDefault() }));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function emptyState() {
  return { sessions: [], attempts: {}, events: [] };
}

function readState() {
  try {
    const state = JSON.parse(readFileSync(stateFile, "utf8"));
    return {
      sessions: Array.isArray(state.sessions) ? state.sessions : [],
      attempts: state.attempts && typeof state.attempts === "object" ? state.attempts : {},
      events: Array.isArray(state.events) ? state.events : [],
    };
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  const temporary = `${stateFile}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(temporary, stateFile);
}

function cleanState(state, now = Date.now()) {
  state.sessions = state.sessions.filter((session) => session.expiresAt > now);
  for (const [ip, attempt] of Object.entries(state.attempts)) {
    const lockExpired = attempt.lockUntil && attempt.lockUntil <= now;
    const windowExpired = now - attempt.lastAttempt > attemptWindowMs;
    if (lockExpired || (!attempt.lockUntil && windowExpired)) delete state.attempts[ip];
  }
  state.events = state.events.slice(-maxEvents);
  return state;
}

function addEvent(state, event) {
  state.events.push({ id: randomUUID(), timestamp: Date.now(), ...event });
  state.events = state.events.slice(-maxEvents);
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest();
}

function hashHex(value) {
  return hash(value).toString("hex");
}

function safeEqual(left, right) {
  return timingSafeEqual(hash(left), hash(right));
}

function clientIp(request) {
  const value = request.headers["cf-connecting-ip"]
    || request.headers["x-forwarded-for"]
    || request.socket.remoteAddress
    || "desconocida";
  return String(Array.isArray(value) ? value[0] : value).split(",")[0].trim().slice(0, 64);
}

function deviceName(userAgent = "") {
  let browser = "Navegador";
  let system = "Dispositivo";
  if (/Edg\//i.test(userAgent)) browser = "Edge";
  else if (/Firefox\//i.test(userAgent)) browser = "Firefox";
  else if (/CriOS\//i.test(userAgent) || /Chrome\//i.test(userAgent)) browser = "Chrome";
  else if (/Safari\//i.test(userAgent)) browser = "Safari";
  if (/iPhone/i.test(userAgent)) system = "iPhone";
  else if (/iPad/i.test(userAgent)) system = "iPad";
  else if (/Android/i.test(userAgent)) system = "Android";
  else if (/Windows/i.test(userAgent)) system = "Windows";
  else if (/Macintosh|Mac OS X/i.test(userAgent)) system = "Mac";
  else if (/Linux/i.test(userAgent)) system = "Linux";
  return `${browser} · ${system}`;
}

function getCookie(request, name) {
  for (const cookie of request.headers.cookie?.split(";") ?? []) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function authenticate(request, updateActivity = true) {
  const token = getCookie(request, cookieName);
  if (!token) return null;
  const now = Date.now();
  const state = cleanState(readState(), now);
  const tokenHash = hashHex(token);
  const session = state.sessions.find((item) => safeEqual(item.tokenHash, tokenHash));
  if (!session) return null;
  if (updateActivity && now - session.lastSeen > 60_000) {
    session.lastSeen = now;
    session.ip = clientIp(request);
    writeState(state);
  }
  return { state, session };
}

function resolveEmail(value) {
  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  return aliases[normalized] || "";
}

async function firebasePasswordLogin(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const data = await response.json();
  if (response.ok) return { uid: data.localId, email: data.email || email };
  const firebaseError = String(data?.error?.message || "UNKNOWN_FIREBASE_ERROR")
    .replace(/[^A-Z0-9_:\-. ]/gi, "")
    .slice(0, 160);
  console.warn("Firebase Auth rechazó el inicio de sesión", {
    status: response.status,
    error: firebaseError,
  });
  if (response.status === 400 || response.status === 429) return null;
  throw new Error(`Firebase Auth respondió ${response.status}`);
}

async function readBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 8192) throw new Error("Solicitud demasiado grande");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function securityHeaders(request) {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.themoviedb.org https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...(isHttps ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
  };
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const protocol = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return origin === `${protocol}://${host}`;
}

function json(request, response, status, value, cookie) {
  response.writeHead(status, {
    ...securityHeaders(request),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(cookie ? { "Set-Cookie": cookie } : {}),
  });
  response.end(JSON.stringify(value));
}

function sessionCookie(request, token) {
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionDurationMs / 1000)}${secure}`;
}

function expiredCookie(request) {
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function serveFile(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(publicDir, relativePath);
  if (requestPath === "/" || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(publicDir, "index.html");
  }
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404, securityHeaders(request));
    response.end("No encontrado");
    return;
  }
  const extension = extname(filePath).toLowerCase();
  const noCache = extension === ".html" || requestPath === "/sw.js" || requestPath === "/manifest.webmanifest";
  response.writeHead(200, {
    ...securityHeaders(request),
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": noCache ? "no-cache" : "public, max-age=2592000, immutable",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(filePath).pipe(response);
}

function runCommand() {
  const command = process.argv[2];
  if (!command) return false;
  const state = cleanState(readState());
  if (command === "--unlock-all") {
    state.attempts = {};
    writeState(state);
    console.log("Todos los bloqueos de Diamilo fueron eliminados.");
    return true;
  }
  if (command === "--unlock-ip" && process.argv[3]) {
    delete state.attempts[process.argv[3]];
    writeState(state);
    console.log(`Bloqueo eliminado para ${process.argv[3]}.`);
    return true;
  }
  if (command === "--list-locks") {
    console.table(Object.entries(state.attempts)
      .filter(([, attempt]) => attempt.lockUntil > Date.now())
      .map(([ip, attempt]) => ({ ip, hasta: new Date(attempt.lockUntil).toISOString() })));
    return true;
  }
  console.error("Usa --list-locks, --unlock-all o --unlock-ip <IP>.");
  process.exitCode = 1;
  return true;
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const ip = clientIp(request);
    const device = deviceName(request.headers["user-agent"]);

    if (request.method === "GET" && pathname === "/api/internal/security") {
      const header = request.headers.authorization || "";
      const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!safeEqual(securityToken, supplied)) {
        json(request, response, 404, { error: "not_found" });
        return;
      }
      const state = cleanState(readState());
      writeState(state);
      json(request, response, 200, {
        sessions: state.sessions.map(({ tokenHash: _tokenHash, expiresAt: _expiresAt, ...session }) => session),
        events: state.events.slice(-30).reverse(),
      });
      return;
    }

    if (request.method === "POST" && pathname === "/api/login") {
      if (!sameOrigin(request)) {
        json(request, response, 403, { error: "origin_not_allowed" });
        return;
      }
      const body = JSON.parse(await readBody(request) || "{}");
      const now = Date.now();
      const state = cleanState(readState(), now);
      const attempt = state.attempts[ip];
      if (attempt?.lockUntil > now) {
        const minutes = Math.max(1, Math.ceil((attempt.lockUntil - now) / 60_000));
        json(request, response, 429, { error: "blocked", message: `Acceso bloqueado. Intenta de nuevo en ${minutes} min.` });
        return;
      }

      const email = resolveEmail(body.username || "");
      const password = String(body.password || "").slice(0, 512);
      const firebaseUser = email && password ? await firebasePasswordLogin(email, password) : null;
      if (!firebaseUser) {
        const previous = state.attempts[ip];
        const failures = previous && now - previous.lastAttempt <= attemptWindowMs ? previous.failures + 1 : 1;
        const lockUntil = failures >= maxAttempts ? now + lockDurationMs : 0;
        state.attempts[ip] = { failures, lastAttempt: now, lockUntil };
        addEvent(state, { result: lockUntil ? "blocked" : "failure", ip, device });
        writeState(state);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
        json(request, response, lockUntil ? 429 : 401, {
          error: lockUntil ? "blocked" : "invalid_credentials",
          message: lockUntil ? "Demasiados intentos. Acceso bloqueado durante 15 minutos." : "Usuario o contraseña incorrectos.",
        });
        return;
      }

      delete state.attempts[ip];
      const customToken = await adminAuth.createCustomToken(firebaseUser.uid);
      const token = randomBytes(32).toString("hex");
      state.sessions.push({
        id: randomUUID(),
        tokenHash: hashHex(token),
        user: firebaseUser.email,
        device,
        ip,
        createdAt: now,
        lastSeen: now,
        expiresAt: now + sessionDurationMs,
      });
      addEvent(state, { result: "success", username: firebaseUser.email, ip, device });
      writeState(state);
      json(request, response, 200, { customToken }, sessionCookie(request, token));
      return;
    }

    if (request.method === "POST" && pathname === "/api/session/touch") {
      if (!sameOrigin(request)) {
        json(request, response, 403, { error: "origin_not_allowed" });
        return;
      }
      const auth = authenticate(request);
      json(request, response, auth ? 204 : 401, auth ? {} : { error: "auth_required" });
      return;
    }

    if (request.method === "POST" && pathname === "/api/logout") {
      const auth = authenticate(request, false);
      if (auth) {
        auth.state.sessions = auth.state.sessions.filter((session) => session.id !== auth.session.id);
        addEvent(auth.state, { result: "logout", username: auth.session.user, ip, device });
        writeState(auth.state);
      }
      json(request, response, 200, { ok: true }, expiredCookie(request));
      return;
    }

    if (pathname.startsWith("/api/")) {
      json(request, response, 404, { error: "not_found" });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { ...securityHeaders(request), Allow: "GET, HEAD" });
      response.end();
      return;
    }

    serveFile(request, response);
  } catch (error) {
    console.error(error);
    json(request, response, 500, { error: "server_error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Diamilo disponible en el puerto ${port}`);
});
