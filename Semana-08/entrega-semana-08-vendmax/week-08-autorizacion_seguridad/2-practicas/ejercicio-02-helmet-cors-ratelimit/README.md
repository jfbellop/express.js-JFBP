# Ejercicio 02: Helmet, CORS, Rate Limiting y Sanitización

## 🎯 Objetivo

Aplicar las cuatro capas de seguridad HTTP a una API Express existente: headers seguros con Helmet, control de acceso con CORS, limitación de requests con Rate Limiting y sanitización de entradas con express-mongo-sanitize.

## 📋 Requisitos Previos

- Ejercicio 01 completado (RBAC con requireRole)
- Docker corriendo con MongoDB

## 🚀 Setup

```bash
cd starter
cp .env.example .env
docker compose up -d
pnpm install
pnpm dev
```

La API ya tiene rutas funcionales en `http://localhost:3000/api/v1`. Tu tarea es agregar las capas de seguridad.

---

## PASO 1: Aplicar Helmet (headers de seguridad)

`helmet` agrega automáticamente 12 headers de seguridad HTTP. Debe aplicarse **antes** de todas las rutas.

Abre `starter/src/app.ts` y descomenta la sección de Helmet:

```ts
// Aplica los 12 headers de seguridad por defecto
app.use(helmet());
```

**Verifica en Thunder Client:**

Haz `GET http://localhost:3000/api/v1/health` y revisa los headers de respuesta. Deberías ver:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `Content-Security-Policy: ...`

---

## PASO 2: Configurar Rate Limiting global

El rate limiter global protege todos los endpoints de abuso. Abre `starter/src/config/security.ts` y descomenta el bloque del `globalLimiter`:

```ts
// export const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 100,
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
//   message: { error: 'Too many requests, please try again later' },
// });
```

Luego en `starter/src/app.ts` descomenta la línea que aplica el `globalLimiter`.

**Verifica:** Los headers `RateLimit-Limit: 100` y `RateLimit-Remaining: 99` deben aparecer en todas las respuestas.

---

## PASO 3: Configurar Rate Limiting para autenticación

Los endpoints de login y registro necesitan un límite más estricto (5 intentos / 15 min). Abre `starter/src/config/security.ts` y descomenta el bloque del `authLimiter`:

```ts
// export const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5,
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
//   message: { error: 'Too many login attempts, please try again later' },
// });
```

Luego en `starter/src/routes/auth.routes.ts` descomenta las líneas que aplican `authLimiter` a `/login` y `/register`.

**Verifica:** Haz 6 requests seguidos a `POST /api/v1/auth/login`. El 6to debe retornar `429 Too Many Requests`.

---

## PASO 4: Configurar CORS con whitelist

CORS nunca debe ser `cors()` a secas — eso permite cualquier origen. Usa el patrón whitelist. Abre `starter/src/config/security.ts` y descomenta el bloque `corsOptions`:

```ts
// const ALLOWED_ORIGINS = [
//   'http://localhost:5173',
//   'http://localhost:3001',
// ];
//
// export const corsOptions: CorsOptions = {
//   origin: (origin, callback) => {
//     if (!origin || ALLOWED_ORIGINS.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error(`CORS blocked: ${origin}`));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PATCH', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };
```

Luego en `starter/src/app.ts` descomenta las líneas que aplican `cors(corsOptions)` y el preflight `OPTIONS`.

**Verifica:** Desde Thunder Client (no hay CORS en HTTP clients), pero anota en tu README qué pasaría si un browser hace un request desde `http://evil.com`.

---

## PASO 5: Aplicar express-mongo-sanitize

`express-mongo-sanitize` elimina operadores MongoDB (`$gt`, `$where`, etc.) de los inputs para prevenir NoSQL injection. Abre `starter/src/app.ts` y descomenta la línea de `mongoSanitize`.

**Verifica:** Envía este body a `POST /api/v1/auth/login`:

```json
{
  "email": { "$gt": "" },
  "password": { "$gt": "" }
}
```

Sin sanitización, esto podría bypassear el login. Con `express-mongo-sanitize`, los operadores son eliminados y el login retorna `401 Invalid credentials`.

---

## 🧪 Casos de Prueba (Thunder Client)

| # | Request | Expected |
|---|---------|----------|
| 1 | `GET /api/v1/health` | 200, headers Helmet visibles |
| 2 | `GET /api/v1/health` (check headers) | `X-Content-Type-Options: nosniff` presente |
| 3 | `GET /api/v1/health` (check rate limit) | `RateLimit-Limit: 100` presente |
| 4 | `POST /api/v1/auth/login` (6 veces) | 6to request → 429 Too Many Requests |
| 5 | `POST /api/v1/auth/login` con `{"email": {"$gt": ""}, "password": {"$gt": ""}}` | 401 Invalid credentials (sanitized) |
| 6 | `POST /api/v1/auth/login` con credenciales válidas | 200, accessToken |

---

## ✅ Criterios de Éxito

- [ ] Headers de Helmet visibles en todas las respuestas
- [ ] `RateLimit-Limit` y `RateLimit-Remaining` en headers
- [ ] Sexto request a `/login` retorna 429
- [ ] NoSQL injection no bypassea el login
- [ ] CORS configurado con whitelist (no `cors()` a secas)
