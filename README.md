# Diamilo

PWA compartida para películas, planes, metas y recuerdos, con React, Firebase y un servidor de autenticación propio.

## Demo para el portafolio

La pantalla de acceso ofrece **Explorar demo**, sin crear una cuenta ni compartir
credenciales. El enlace directo es `/?demo=1#/` (añade el prefijo del repositorio
si lo sirves con GitHub Pages).

- La demo utiliza los perfiles ficticios Alex y Sam, una fecha de ejemplo,
  películas ficticias, planes, metas y una mascota independiente.
- Permite crear, editar y borrar ejemplos. Los cambios viven en `sessionStorage`
  de esa pestaña, con respaldo en memoria si el navegador bloquea almacenamiento.
- **Restablecer ejemplo** recupera los datos iniciales. Una pestaña nueva que no
  copie la sesión comienza desde los ejemplos; no hay una cuenta compartida.
- En modo demo no se inicializa Firebase, no se usa su caché y no se llama a
  ninguna ruta `/api` ni a TMDB. Funciona sin credenciales de esos servicios y
  puede hospedarse estáticamente, sin depender de la Raspberry.
- Salir vuelve al acceso privado. La autenticación privada sigue usando el servidor.

Para probarla: `npm install`, `npm run dev` y abrir la dirección de Vite con
`?demo=1#/`. Para crear una versión exclusivamente de demostración ejecuta
`npm run build:demo`: se genera `dist-demo/`, que puedes alojar estáticamente.
Esta versión entra siempre en la demo, incluso sin el parámetro `demo`, y su
botón Inicio vuelve a la portada de ejemplo. No sustituye la compilación privada
en `dist/`. Por defecto esta versión usa rutas relativas y se puede alojar en
la raíz de un dominio o en una subcarpeta; puedes fijar `VITE_BASE_PATH` al compilar
si tu alojamiento necesita una ruta específica. No subas archivos
`.env` ni credenciales de servicio al alojamiento.

La portada privada puede mostrar una firma propia con `VITE_COUPLE_NAMES`;
si no la configuras, muestra «Nuestro espacio compartido». El contador privado
conserva su fecha y el cuidado de la mascota conserva su comportamiento anterior.

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

El acceso privado acepta correos de Firebase. Para conservar atajos de usuario,
configúralos **en el servidor** con `DIAMILO_LOGIN_ALIASES`, por ejemplo
`{"alex":"alex@example.com"}`. Al actualizar una instalación anterior, añade sus
alias a esa variable o utiliza el correo para iniciar sesión. Los alias y correos
personales dejaron de estar escritos en el código público.


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
