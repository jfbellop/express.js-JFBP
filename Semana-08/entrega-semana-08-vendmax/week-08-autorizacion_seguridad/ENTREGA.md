# Entrega — Semana 08: Autorización y Seguridad

**Dominio asignado:** Máquinas Expendedoras (**VendMax**)
**Estado:** los 3 entregables implementados, ejecutados y verificados — **117 comprobaciones
automáticas, 0 fallos**

---

## 📦 Qué contiene esta entrega

```
week-08-autorizacion_seguridad/
├── ENTREGA.md                        ← este documento
├── cuestionario-conocimiento.md      ← 10 preguntas resueltas (30 % de la nota)
│
├── 2-practicas/
│   ├── ejercicio-01-rbac-roles/
│   │   ├── SOLUCION.md               ← explicación del ejercicio
│   │   └── starter/                  ← código completo y ejecutable
│   └── ejercicio-02-helmet-cors-ratelimit/
│       ├── SOLUCION.md
│       └── starter/
│
├── 3-proyecto/
│   ├── README.md                     ← tabla de roles/permisos, capas de seguridad, endpoints
│   └── starter/                      ← VendMax API
│
├── coleccion-api/
│   ├── vendmax-semana08.http         ← 33 bloques para REST Client (vía recomendada)
│   ├── vendmax-semana08.postman_collection.json  ← 40 requests con aserciones
│   └── README.md
│
└── evidencias/
    ├── ejercicio-01-rbac-test-flow.txt
    ├── ejercicio-02-seguridad-test-flow.txt
    ├── proyecto-vendmax-test-flow.txt
    ├── proyecto-capas-seguridad-curl.txt   ← cabeceras HTTP reales
    ├── proyecto-seed.txt
    └── screenshots/                        ← capturas a añadir
```

---

## ✅ Estado: los 3 entregables verificados

| Entregable | Verificación | Resultado |
|---|---|---|
| **Ejercicio 01 — RBAC** | `pnpm test:flow` (26 comprobaciones) | ✅ **26 / 26** |
| **Ejercicio 02 — Helmet, CORS, rate limit, sanitize** | `pnpm test:flow` (31 comprobaciones) | ✅ **31 / 31** |
| **Proyecto VendMax** | `pnpm test:flow` (60 comprobaciones) | ✅ **60 / 60** |
| Compilación TypeScript | `pnpm typecheck` en los tres | ✅ sin errores |

Cada starter incluye un script `src/scripts/test-flow.ts` que ejerce la API de punta a punta y
muestra un ✅/❌ por criterio. Las salidas completas están en `evidencias/`.

---

## 🥤 El dominio: VendMax

Operadora de máquinas expendedoras. El recurso propio es **`Machine`** (`/api/v1/machines`), con
nombres reales del negocio en todo el código: `code` (`VM-001`), `modelName`, `type`
(`snacks` / `bebidas` / `mixta` / `cafe`), `location`, `status`
(`operativa` / `mantenimiento` / `fuera_de_servicio`), `slots`, `temperatureC`,
`cashBalanceCents`, `lastRestockedAt`, `createdBy`. Ni un `item`, ni un `resource`, ni un `thing`.

Lo que hace interesante este dominio para la semana de autorización es que tiene un campo
**genuinamente sensible**: `cashBalanceCents`, el dinero físico que hay dentro de cada máquina.
Eso obliga a un RBAC de tres niveles en lugar de un simple "admin sí, user no":

| Nivel | Pregunta | Dónde vive |
|---|---|---|
| Ruta | ¿tu **rol** está permitido? | `requireRole('admin')` en `machine.routes.ts` |
| Recurso | ¿esta máquina es **tuya**? | `machine.service.ts` (PATCH: dueño o admin) |
| Campo | ¿puedes **ver** el recaudo? | `machine.controller.ts` (`serialize`) |

El detalle que cierra el diseño: **ser dueño no lo es todo**. Un operador puede editar su máquina,
pero no puede retirarle el dinero ni darla de baja — eso es competencia de administración.

---

## 🔐 Las capas de seguridad, medidas

Salida real de `curl -i` (completa en `evidencias/proyecto-capas-seguridad-curl.txt`):

```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-DNS-Prefetch-Control: off
Referrer-Policy: no-referrer
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
RateLimit-Limit: 100
RateLimit-Remaining: 99
                              ← x-powered-by: ELIMINADA por helmet
```

| Ataque | Defensa | Resultado verificado |
|---|---|---|
| Fuerza bruta en el login | `authLimiter` 5/15 min | **429** al sexto intento; `/health` y `/machines` siguen en 200 |
| Scraping y abuso general | `globalLimiter` 100/15 min | `RateLimit-Remaining` descontando en cada petición |
| Petición desde una web ajena | CORS con whitelist | `evil.com` → **403** `{"error":"CORS: origin not allowed"}` sin cabecera CORS |
| NoSQL injection | `express-mongo-sanitize` + Zod | `{"email":{"$gt":""}}` → **400**, nunca un token |
| XSS almacenado | Zod rechaza `<` y `>` | `<script>alert(1)</script>` en `modelName` → **400** |
| Mass assignment | Schemas Zod sin campos privilegiados | `cashBalanceCents` y `createdBy` enviados por el cliente se descartan |
| Escalada de privilegios | `authMiddleware` → `requireRole` → dueño-o-admin | 401 / 403 según corresponda |
| Fuga de información interna | `errorHandler` centralizado | Ni un `stack` en ninguna respuesta |
| Secretos en el repositorio | Todo en `.env` (incluido `CORS_ORIGINS`) | `git grep` no encuentra ningún secreto |

---

## 🐛 Bugs del starter que hubo que corregir

Los tres primeros **impiden que el servidor arranque o que responda**; no son mejoras opcionales.

### 1. `app.options('*', cors(...))` rompe Express 5

```
TypeError: Missing parameter name at 1
    at path-to-regexp ...
```

Express 5 usa `path-to-regexp` v8, donde `'*'` dejó de ser un comodín válido (ahora sería `'*splat'`).
**Corrección:** eliminar la línea. `app.use(cors(corsOptions))` ya responde a los preflight
`OPTIONS` por sí solo — verificado: `OPTIONS /machines` → 204 con
`access-control-allow-methods: GET,POST,PATCH,DELETE`.

### 2. `express-mongo-sanitize` no puede escribir `req.query` en Express 5

```
TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
```

La versión 2.2.0 reasigna `req.query`, que en Express 5 es solo lectura.
**Corrección:** redefinirla como propiedad escribible justo antes del middleware:

```ts
app.use((req, _res, next) => {
  Object.defineProperty(req, 'query', {
    value: req.query, writable: true, configurable: true, enumerable: true,
  });
  next();
});
app.use(mongoSanitize());
```

### 3. `@types/express-mongo-sanitize@2.1.4` no existe

`pnpm install` falla de entrada en el ejercicio 02: la última versión publicada es la **2.1.2**.
Como la propia librería ya incluye sus tipos, **se eliminó la devDependencia** en lugar de fijar
otra versión.

### 4. `errorHandler` sin rama para `ZodError` ni para CORS

Sin la rama de Zod, un payload inválido acababa en el 500 genérico. Sin la rama de CORS, el
`Error` que lanza el callback de `cors` también caía en el 500: un origen bloqueado parecía un
fallo del servidor en vez de una política aplicada a propósito. Ahora:
`AppError → ZodError → Mongoose Validation/Cast → duplicado 11000 → CORS blocked → 500 genérico`.

### 5. `model` colisiona con `Document.model()` de Mongoose

```
error TS2430: Interface 'IMachine' incorrectly extends interface 'Document'.
  Types of property 'model' are incompatible.
```

El campo natural del dominio ("modelo de la máquina") choca con el método `model()` que Mongoose
inyecta en todo documento. **Corrección:** el campo se llama `modelName`.

---

## 🔧 Ajustes al starter del bootcamp

| Ajuste | Motivo |
|---|---|
| Script `pnpm mongo` (`src/scripts/mongo-dev.ts`) | Levanta MongoDB real en `localhost:27017` con `mongodb-memory-server`, **sin Docker ni instalación**. Docker Desktop no cabía en el equipo y el instalador oficial fallaba con *hash mismatch* |
| `pnpm.onlyBuiltDependencies: ["bcrypt", "mongodb-memory-server"]` | pnpm 10 bloquea los scripts de compilación por defecto y `bcrypt_lib.node` no se genera → `pnpm dev` fallaba al arrancar |
| Script `pnpm seed` | Datos realistas del dominio: 3 usuarios (2 roles) y 6 máquinas repartidas entre dos dueños |
| Script `pnpm test:flow` | Verificación automática end-to-end de todos los criterios de la rúbrica |
| Script `pnpm typecheck` | `tsc --noEmit` para validar tipos sin compilar |
| `standardHeaders: 'draft-6'` **+** `legacyHeaders: true` | El enunciado verifica `RateLimit-Limit: 100` (draft-6) y la rúbrica pide `X-RateLimit-Remaining` (legacy). `draft-7` fusionaría ambas en una sola cabecera, así que se emiten las dos familias |
| `CORS_ORIGINS` leído del `.env` | La whitelist no debe requerir tocar código al desplegar |
| Alias `GET /api/v1/dashboard` (ejercicio 01) | El enunciado la cita sin prefijo y el starter la sitúa en `/users/dashboard`: ambas responden |
| `optionalAuth` (nuevo middleware, proyecto) | El catálogo es público, pero si llega un token válido se enriquece la respuesta. Sin él habría que elegir entre "todo público" o "todo protegido" |
| `.env` incluido en la entrega | Para que el evaluador pueda ejecutar sin generar secretos. Los valores son aleatorios y de un solo uso; el `.gitignore` documenta que en un proyecto real iría excluido |

---

## ▶️ Cómo ejecutar cada entregable

Requisitos: **Node ≥ 22** y **pnpm** (`npm install -g pnpm`). No hace falta Docker ni MongoDB
instalado.

### Opción A — sin Docker (la que se usó para verificar)

```powershell
# 1. Instalar dependencias (una vez por carpeta)
cd week-08-autorizacion_seguridad\3-proyecto\starter
pnpm install
pnpm rebuild bcrypt        # solo si bcrypt se queja del binario nativo

# 2. TERMINAL 1 — base de datos (dejar abierta)
pnpm mongo
#    → MongoDB escuchando en mongodb://localhost:27017

# 3. TERMINAL 2 — datos de ejemplo y servidor
pnpm seed
pnpm dev
#    → VendMax API → http://localhost:3000

# 4. TERMINAL 3 — verificación automática
pnpm test:flow
#    → RESULTADO: 60 pruebas OK, 0 fallidas
```

### Opción B — con Docker

```powershell
docker compose up -d        # levanta MongoDB en el 27017
pnpm install
pnpm rebuild bcrypt
pnpm seed
pnpm dev
```

Los dos ejercicios de `2-practicas/` se ejecutan exactamente igual (`pnpm install`, `pnpm mongo`,
`pnpm seed`, `pnpm dev`, `pnpm test:flow`), cada uno con su propia base de datos:
`rbac_ejercicio`, `security_ejercicio` y `vendmax_semana08`.

> ⚠️ **Al repetir `test:flow`:** el script agota a propósito el rate limit de `/auth`
> (5 intentos / 15 min). Antes de volver a lanzarlo hay que **reiniciar `pnpm dev`**; el contador
> vive en memoria y se reinicia con el proceso. El propio script lo recuerda al terminar.

---

## 📸 Screenshots que faltan por capturar

El código y las evidencias en texto están completos; estas capturas son la parte visual que pide
la rúbrica. La forma más rápida es con `coleccion-api/vendmax-semana08.http` (bloques marcados 📸)
y guardarlas en `evidencias/screenshots/`:

| # | Captura | Cómo obtenerla |
|---|---|---|
| 1 | Cabeceras de Helmet | Bloque `00` → pestaña **Headers** de la respuesta |
| 2 | CORS: origen permitido vs bloqueado | Bloques `01` y `02` (403 sin cabecera CORS) |
| 3 | `X-RateLimit-Remaining` visible | Bloque `00` → Headers |
| 4 | Rate limit de auth → 429 | Bloque `92` repetido seis veces |
| 5 | NoSQL injection → 400 | Bloque `04` |
| 6 | Catálogo público sin campos sensibles | Bloque `10` |
| 7 | `role` firmado dentro del JWT | Bloque `32` → pegar el token en jwt.io |
| 8 | Usuario no dueño → 403 | Bloque `61` |
| 9 | Rol `user` en ruta de admin → 403 | Bloque `70` |
| 10 | `DELETE` solo admin | Bloques `80` (403) y `81` (200) |

---

## 📋 Autoevaluación contra la rúbrica

### Desempeño — Ejercicio 01 (20 pts)

| Criterio | Pts | Estado |
|---|---|---|
| `requireRole()` implementado | 5 | ✅ *higher-order function* con rest params |
| `GET /admin/users` → 403 para rol `user` | 4 | ✅ verificado |
| `GET /dashboard` accesible a ambos roles | 3 | ✅ + alias sin prefijo |
| `GET /public` sin token | 3 | ✅ |
| 401 sin token / 403 sin permiso | 2 | ✅ diferenciados |
| `role` en el payload del JWT | 3 | ✅ decodificado en la prueba |

### Desempeño — Ejercicio 02 (20 pts)

| Criterio | Pts | Estado |
|---|---|---|
| Helmet con cabeceras visibles | 4 | ✅ 6 cabeceras medidas |
| CORS con whitelist | 4 | ✅ configurable por `.env` |
| Rate limit en `/auth` (5/15 min) | 4 | ✅ 429 al sexto intento |
| Rate limit global (100/15 min) | 3 | ✅ |
| `X-RateLimit-Remaining` visible | 2 | ✅ draft-6 + legacy |
| Origen no permitido rechazado | 3 | ✅ 403, no 500 |

### Producto — Proyecto (100 pts)

| Criterio | Pts | Estado |
|---|---|---|
| `authMiddleware` en rutas privadas | 10 | ✅ POST, PATCH, DELETE, reportes |
| `requireRole('admin')` en administrativas | 10 | ✅ DELETE, recaudo, reportes |
| Helmet configurado | 8 | ✅ |
| CORS sin `*` | 8 | ✅ whitelist + `credentials: true` |
| Rate limiting en auth | 8 | ✅ |
| Rate limiting global | 5 | ✅ |
| `express-mongo-sanitize` | 8 | ✅ + parche de Express 5 |
| Sin secretos en el código | 8 | ✅ todo en `.env` |
| Errores sin stack trace | 7 | ✅ `errorHandler` con 7 ramas |
| CRUD con RBAC | 10 | ✅ 3 niveles: ruta, recurso y campo |
| Nombres del dominio | 8 | ✅ `Machine`, `VM-001`, `cashBalanceCents`… |
| README con las capas de seguridad | 5 | ✅ `3-proyecto/README.md` |
| API funcionando end-to-end | 5 | ✅ 60/60 |

**Penalizaciones evitadas:** contraseñas siempre con bcrypt (12 rondas), ningún secreto
hardcodeado, CORS sin comodín, Helmet activo, rate limit en auth, cero stack traces, roles
comprobados en middleware (no en los controladores) y sanitización activa.

---

## ➡️ Relación con la semana 07

Esta semana **continúa** la anterior sobre el mismo dominio: la autenticación (JWT, bcrypt,
refresh con rotación) venía de la semana 07 y aquí se le añade la capa de autorización y las
defensas HTTP. El recurso `Machine` es el mismo del proyecto de la semana 07, ahora con RBAC de
tres niveles y visibilidad de campos según el rol.
