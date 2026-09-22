# Diamilo

PWA compartida para películas, planes, metas y recuerdos, con React, Firebase y un servidor de autenticación propio.

## Nuestro inicio

- La portada muestra a Diana y Camilo con dos gatitos y el tiempo que llevan juntos.
- El contador parte del **9 de enero de 2026 a las 00:01 de Colombia** (`2026-01-09T00:01:00-05:00`), definido en `src/lib/relationship.ts`.
- Cada actualización calcula la diferencia con el reloj del dispositivo. No depende de un contador guardado, del tiempo que lleva abierta la página ni de que la Raspberry permanezca encendida. Al volver a la pestaña se actualiza inmediatamente.
- Zanahoria tiene necesidades por hora: pierde 2 puntos de saciedad y 1 de energía, limpieza y felicidad. Una ausencia larga acumula como máximo 48 horas de desgaste; su edad conserva todo el tiempo transcurrido. El buen cuidado también recupera salud gradualmente.

## Seguridad

- Las credenciales se validan contra Firebase desde el servidor.
- El navegador recibe un token personalizado de Firebase; la contraseña nunca se devuelve ni se guarda.
- Sesión adicional por dispositivo, válida durante un máximo de siete días.
- Bloqueo por IP durante 15 minutos después de cinco errores dentro de 15 minutos.
- Sesiones, bloqueos y los 200 eventos más recientes se guardan en `/app/data/security.json`.
- API interna protegida por token para mostrar sesiones y actividad en App Hub.
- Cookies `HttpOnly`, `SameSite=Strict`, protección de origen y cabeceras CSP/HSTS.

Después del primer despliegue con esta versión, las sesiones Firebase antiguas deberán iniciar sesión nuevamente para quedar registradas.

## Variables

Además de las variables `VITE_FIREBASE_*` y `VITE_TMDB_API_KEY` existentes, configura:

```env
DIAMILO_SECURITY_TOKEN=un-token-largo-y-aleatorio
```

El servidor acepta `FIREBASE_API_KEY` o reutiliza `VITE_FIREBASE_API_KEY` para validar las credenciales.

## Docker

La imagen necesita el archivo de cuenta de servicio de Firebase montado como secreto. Ese JSON está ignorado por Git y Docker y no se copia dentro de la imagen.

```bash
docker build \
  --build-arg VITE_BASE_PATH="/" \
  --build-arg VITE_FIREBASE_API_KEY="..." \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="..." \
  --build-arg VITE_FIREBASE_PROJECT_ID="..." \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="..." \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="..." \
  --build-arg VITE_FIREBASE_APP_ID="..." \
  --build-arg VITE_TMDB_API_KEY="..." \
  -t app-diamilo:latest .
```

```bash
docker run -d \
  --name app-diamilo \
  --restart unless-stopped \
  --env-file .env \
  -v app-diamilo-data:/app/data \
  -v /ruta/firebase-service-account.json:/run/secrets/firebase-service-account.json:ro \
  -p 3001:8080 \
  app-diamilo:latest
```

El dominio debe continuar apuntando a `http://localhost:3001`.

## Conectar con App Hub

Genera un token exclusivo para Diamilo:

```bash
openssl rand -hex 32
```

Configúralo como `DIAMILO_SECURITY_TOKEN` tanto en Diamilo como en el Hub. En el `.env` del Hub añade:

```env
DIAMILO_SECURITY_URL=https://diamilo.camiska.lat/api/internal/security
DIAMILO_SECURITY_TOKEN=el-mismo-token
```

## Administrar bloqueos

```bash
docker exec app-diamilo node server.mjs --list-locks
docker exec app-diamilo node server.mjs --unlock-ip 192.0.2.10
docker exec app-diamilo node server.mjs --unlock-all
```

## Desarrollo

```bash
npm install
npm test
npm run lint
npm run build
```

`npm run dev` sirve únicamente el frontend. Para probar el login completo utiliza el contenedor o ejecuta `npm start` con las variables y credenciales de Firebase configuradas.
