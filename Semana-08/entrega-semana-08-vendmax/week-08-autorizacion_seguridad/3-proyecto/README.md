# 🥤 VendMax API — Máquinas expendedoras con RBAC y capas de seguridad

**Proyecto de la semana 08 · Autorización y Seguridad**
Código: [`starter/`](./starter) · Verificación automática: **60 / 60 pruebas OK**
([evidencia](../evidencias/proyecto-vendmax-test-flow.txt) · [cabeceras con curl](../evidencias/proyecto-capas-seguridad-curl.txt))

VendMax opera un parque de máquinas expendedoras. Esta API gestiona el inventario de máquinas:
el catálogo es público (cualquiera puede ver dónde hay una máquina y si funciona), los operadores
registran y mantienen las suyas, y solo administración puede retirar el recaudo o dar de baja una
máquina.

---

## 1. Actores y roles

| Rol | Quién es | Qué puede hacer |
|-----|----------|-----------------|
| *(anónimo)* | Un cliente que busca una máquina cercana | Consultar el catálogo: código, tipo, ubicación, estado y bandejas |
| `user` | Operador o técnico de ruta | Todo lo anterior + registrar máquinas y editar **las suyas** |
| `admin` | Administración VendMax | Todo lo anterior sobre **cualquier** máquina + retirar recaudo, eliminar y ver el reporte financiero |

Usuarios creados por `pnpm seed`:

| Email | Contraseña | Rol | Notas |
|-------|-----------|-----|-------|
| `admin@vendmax.co` | `Admin1234!` | `admin` | Administración |
| `operador@vendmax.co` | `Operador1234!` | `user` | Dueño de 4 máquinas |
| `tecnico@vendmax.co` | `Tecnico1234!` | `user` | Dueño de 2 máquinas |

> El tercer usuario existe por un motivo concreto: permite demostrar el caso que distingue un RBAC
> real de uno de juguete — **un usuario autenticado que intenta editar el recurso de otro recibe
> 403**, no 200.

---

## 2. Matriz de permisos por endpoint

| Método | Endpoint | Anónimo | `user` (no dueño) | `user` (dueño) | `admin` |
|--------|----------|:-------:|:-----------------:|:--------------:|:-------:|
| `GET` | `/api/v1/machines` | ✅ 200 (campos públicos) | ✅ 200 | ✅ 200 (+ recaudo propio) | ✅ 200 (todo) |
| `GET` | `/api/v1/machines/:id` | ✅ 200 (campos públicos) | ✅ 200 | ✅ 200 | ✅ 200 |
| `POST` | `/api/v1/machines` | ❌ 401 | ✅ 201 | ✅ 201 | ✅ 201 |
| `PATCH` | `/api/v1/machines/:id` | ❌ 401 | ❌ **403** | ✅ 200 | ✅ 200 |
| `POST` | `/api/v1/machines/:id/recaudo` | ❌ 401 | ❌ 403 | ❌ **403** | ✅ 200 |
| `DELETE` | `/api/v1/machines/:id` | ❌ 401 | ❌ 403 | ❌ **403** | ✅ 200 |
| `GET` | `/api/v1/machines/reportes/recaudo` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 200 |
| `GET` | `/api/v1/health` | ✅ 200 | ✅ | ✅ | ✅ |
| `POST` | `/api/v1/auth/register` · `/login` | ✅ (5 intentos / 15 min) | — | — | — |
| `GET` | `/api/v1/auth/me` · `/users/dashboard` | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 |

Las tres celdas en negrita son las que separan "tener sesión" de "tener permiso":

- Un operador **no puede** editar la máquina de otro operador, aunque esté perfectamente
  autenticado.
- Un operador **no puede** retirar el recaudo ni siquiera de su propia máquina: mover dinero es
  competencia de administración. Ser dueño no lo es todo.
- Un operador **no puede** eliminar su propia máquina: dar de baja un activo es una decisión
  administrativa con trazabilidad.

### Dónde se decide cada cosa

```
requireRole('admin')          →  middleware, en routes/machine.routes.ts
   "¿tu rol está en la lista?"   DELETE, recaudo y reportes

dueño-o-admin                 →  services/machine.service.ts
   "¿esta máquina es tuya?"      PATCH — el middleware no puede saberlo:
                                 depende del documento concreto

visibilidad de campos         →  controllers/machine.controller.ts (serialize)
   "¿puedes ver el recaudo?"     el mismo recurso se serializa distinto
                                 según quién pregunte
```

Un `requireRole` no basta para autorizar por propiedad: el middleware se ejecuta antes de saber
qué documento se va a tocar. Por eso la comprobación de dueño vive en el servicio, que ya tiene la
máquina cargada.

---

## 3. Autorización a nivel de campo

El mismo `GET /api/v1/machines/:id` devuelve distinta información según quién la pida:

```jsonc
// Anónimo — lo que le sirve a un cliente
{ "id": "...", "code": "VM-001", "modelName": "CoolDrink 500", "type": "bebidas",
  "location": "Universidad Nacional — Bloque A", "status": "operativa",
  "slots": 40, "temperatureC": 4 }

// Usuario autenticado que NO es el dueño — añade gestión, nunca dinero
{ ...lo anterior, "notes": "...", "lastRestockedAt": "...", "createdBy": "68f...",
  "active": true, "createdAt": "...", "updatedAt": "..." }

// Dueño o admin — añade el recaudo
{ ...lo anterior, "cashBalanceCents": 185400 }
```

`cashBalanceCents` es el dinero físico que hay dentro de la máquina. Publicarlo en un endpoint
abierto sería entregar un mapa ordenado por botín a quien quiera reventarlas. Que un endpoint sea
público no significa que todos sus campos deban serlo.

---

## 4. Capas de seguridad (y qué detiene cada una)

| # | Capa | Implementación | Ataque que mitiga | Evidencia |
|---|------|----------------|-------------------|-----------|
| 1 | **Helmet** | `app.use(helmet())` | MIME sniffing, clickjacking, downgrade a HTTP, XSS reflejado | `nosniff`, `SAMEORIGIN`, `HSTS 31536000`, CSP, sin `X-Powered-By` |
| 2 | **Rate limit global** | 100 req / 15 min / IP | Scraping y abuso general | `RateLimit-Limit: 100`, `X-RateLimit-Remaining: 99` |
| 3 | **Rate limit de auth** | 5 intentos / 15 min en `/login` y `/register` | Fuerza bruta y credential stuffing | 429 al sexto intento, resto de la API intacta |
| 4 | **CORS con whitelist** | `localhost:5173`, `localhost:3001`, `credentials: true` | Peticiones autenticadas desde webs de terceros | `evil.com` → 403 sin cabecera CORS |
| 5 | **express-mongo-sanitize** | Elimina claves `$` y `.` | NoSQL injection (`{"$gt":""}` para saltarse el login) | login con `$gt` → 400, nunca un token |
| 6 | **Validación Zod** | Schemas por endpoint | Mass assignment, XSS almacenado, payloads gigantes | `<script>` en un campo → 400 |
| 7 | **JWT + bcrypt** | Access 15 min, refresh 7 días en cookie `httpOnly`, hash con 12 rondas | Robo de sesión, filtración de contraseñas | `role` firmado dentro del token |
| 8 | **RBAC** | `authMiddleware` → `requireRole` → dueño-o-admin | Escalada de privilegios | 401/403 según corresponda |
| 9 | **Errores silenciosos** | `errorHandler` centralizado | Fuga de rutas, versiones y estructura interna | Ni un `stack` en ninguna respuesta |
| 10 | **Secretos fuera del código** | Todo en `.env`, `CORS_ORIGINS` incluido | Credenciales en el repositorio | `git grep` no encuentra ningún secreto |

Orden real en `app.ts` (el orden **es** la configuración):

```ts
helmet → globalLimiter → cors → json/urlencoded/cookies → [parche req.query] → mongoSanitize
       → rutas → notFound → errorHandler
```

---

## 5. Reglas de negocio del dominio

Más allá del RBAC, la API defiende la coherencia del parque de máquinas:

| Regla | Respuesta |
|-------|-----------|
| Código duplicado (`VM-001` ya existe) | `409 Conflict` |
| Código que no cumple el formato `VM-000` | `400 Bad Request` |
| Máquina de `snacks` con `temperatureC` | `422 Unprocessable Entity` — una máquina de snacks no es refrigerada |
| Pasar de `fuera_de_servicio` directamente a `operativa` | `409` — debe pasar por `mantenimiento` |
| Eliminar una máquina con recaudo pendiente | `409` — primero se retira el dinero |
| Retirar recaudo de una máquina ya vacía | `409` |
| `id` con formato inválido | `400` · máquina inexistente → `404` |
| `PATCH` con el cuerpo vacío | `400` |
| Texto con `<` o `>` en `modelName`, `location` o `notes` | `400` — anti-XSS almacenado |

---

## 6. Modelo de datos

```ts
// src/models/machine.model.ts
{
  code: string;              // ^VM-\d{3}$ — único
  modelName: string;         // "model" a secas colisiona con Document.model() de Mongoose
  type: 'snacks' | 'bebidas' | 'mixta' | 'cafe';
  location: string;
  status: 'operativa' | 'mantenimiento' | 'fuera_de_servicio';
  slots: number;             // bandejas, 1..100
  temperatureC?: number;     // solo en máquinas refrigeradas
  cashBalanceCents: number;  // recaudo acumulado — campo sensible
  lastRestockedAt?: Date;
  notes?: string;
  active: boolean;
  createdBy: string;         // id del operador propietario → base de la regla dueño-o-admin
  createdAt / updatedAt
}
```

---

## 7. Cómo ejecutarlo

```bash
cd starter
pnpm install
pnpm rebuild bcrypt   # solo si bcrypt se queja del binario nativo

pnpm mongo            # terminal 1 — MongoDB en localhost:27017, sin Docker ni instalación
pnpm seed             # terminal 2 — 3 usuarios + 6 máquinas
pnpm dev              # terminal 2 — http://localhost:3000
pnpm test:flow        # terminal 3 — 60 comprobaciones automáticas
```

Alternativa con Docker, si se prefiere: `docker compose up -d` y luego `pnpm seed` / `pnpm dev`.

Para probar a mano hay una colección lista en
[`../coleccion-api/vendmax-semana08.http`](../coleccion-api/vendmax-semana08.http) (extensión
**REST Client** de VS Code): incluye la matriz RBAC completa y las pruebas de seguridad.

> ⚠️ `pnpm test:flow` agota a propósito el rate limit de `/auth`. Para repetirlo: reinicia
> `pnpm dev` y vuelve a lanzar `pnpm seed`.

---

## 8. Estructura del código

```
starter/src/
├── app.ts                         # 6 capas de seguridad en el orden correcto
├── server.ts                      # arranque + aviso si la BD está vacía
├── config/security.ts             # globalLimiter, authLimiter, corsOptions (whitelist)
├── models/machine.model.ts        # esquema Mongoose + índices
├── schemas/machine.schema.ts      # validación Zod (create / update / query / recaudo)
├── services/machine.service.ts    # reglas de negocio + autorización por propiedad
├── controllers/machine.controller.ts  # HTTP + serialización por rol
├── routes/machine.routes.ts       # matriz de permisos declarada en las rutas
├── middlewares/
│   ├── auth.middleware.ts         # ¿quién eres?        → 401
│   ├── requireRole.ts             # ¿puedes hacerlo?    → 403
│   ├── optionalAuth.ts            # autenticación opcional para rutas públicas
│   ├── errorHandler.ts            # errores uniformes, sin stack traces
│   └── notFound.ts
└── scripts/
    ├── mongo-dev.ts               # MongoDB local sin Docker
    ├── seed.ts                    # 3 usuarios + 6 máquinas
    └── test-flow.ts               # 60 comprobaciones end-to-end
```
