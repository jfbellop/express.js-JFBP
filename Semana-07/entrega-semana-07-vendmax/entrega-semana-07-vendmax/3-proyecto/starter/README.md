# VendMax API — Red de Máquinas Expendedoras

**Bootcamp Express.js · Semana 07 — Proyecto semanal: Autenticación JWT completa**

API REST en Express 5 + TypeScript + MongoDB que gestiona la red de **máquinas
expendedoras** de VendMax. Toda la operación del recurso principal está detrás
de autenticación con **JWT en cookies HttpOnly**, con access token de 15 minutos,
refresh token de 7 días con **rotación** y logout que revoca la sesión en base de datos.

---

## 🏢 El dominio

VendMax opera máquinas expendedoras de snacks, bebidas y café instaladas en
universidades, hospitales, centros empresariales y terminales. El personal de
operaciones necesita saber, desde una sola API: qué máquinas hay, dónde están,
en qué estado operativo se encuentran, cuánto dinero tienen sin recoger y cuándo
se surtieron por última vez.

**Recurso principal: `Machine`** → colección `machines` → `/api/v1/machines`

| Campo | Tipo | Reglas |
|---|---|---|
| `code` | string | **Único**, formato `VM-001` (se normaliza a mayúsculas) |
| `model` | string | 2–60 caracteres |
| `type` | enum | `snacks` \| `bebidas` \| `mixta` \| `cafe` |
| `location` | string | 3–120 caracteres (sede y punto exacto) |
| `status` | enum | `operativa` \| `mantenimiento` \| `fuera_de_servicio` (default `operativa`) |
| `slots` | number | Entero 1–100 (bandejas de producto) |
| `temperatureC` | number? | −10 a 25 °C, solo máquinas refrigeradas |
| `cashBalanceCents` | number | Entero ≥ 0, recaudo pendiente de retiro (default 0) |
| `lastRestockedAt` | date? | Última reposición |
| `notes` | string? | Máx. 280 caracteres |
| `createdBy` | ObjectId | Usuario autenticado que la registró (ref. `User`) |

### Reglas de negocio implementadas

1. **Código irrepetible**: dos máquinas no pueden compartir `code` (`409`).
2. **Transición de estado controlada**: una máquina `fuera_de_servicio` **no**
   puede volver a `operativa` sin pasar antes por `mantenimiento` (`409`).
3. **No se elimina dinero**: no se puede borrar una máquina con
   `cashBalanceCents > 0`; primero se registra el retiro del recaudo (`409`).
4. **Temperatura coherente**: una máquina de `snacks` no acepta `temperatureC` (`422`).

---

## 🔐 Sistema de autenticación

| Endpoint | Método | Acceso | Descripción |
|---|---|---|---|
| `/api/v1/health` | GET | Público | Estado del servicio |
| `/api/v1/auth/register` | POST | Público | Crea usuario, contraseña hasheada con bcrypt (10 rounds) |
| `/api/v1/auth/login` | POST | Público | Verifica con `bcrypt.compare` y emite ambas cookies |
| `/api/v1/auth/refresh` | POST | Cookie `refreshToken` | Rota ambos tokens e invalida el anterior |
| `/api/v1/auth/me` | GET | 🔒 `authMiddleware` | Perfil del usuario autenticado |
| `/api/v1/auth/logout` | POST | 🔒 `authMiddleware` | Borra el hash del refresh token en DB y limpia cookies |

| Endpoint | Método | Acceso | Descripción |
|---|---|---|---|
| `/api/v1/machines` | GET | 🔒 | Lista con filtros `status`, `type`, `location` y paginación `page`/`limit` |
| `/api/v1/machines/:id` | GET | 🔒 | Detalle (404 si no existe, 400 si el id es inválido) |
| `/api/v1/machines` | POST | 🔒 | Crea máquina (201) |
| `/api/v1/machines/:id` | PATCH | 🔒 | Actualización parcial (200) |
| `/api/v1/machines/:id` | DELETE | 🔒 | Elimina (204) |

### Capas de seguridad aplicadas

| Medida | Implementación |
|---|---|
| Contraseñas hasheadas | `bcrypt.hash(password, 10)` — asíncrono, nunca `hashSync` |
| Nunca se devuelve el hash | `password: { select: false }` en el schema de Mongoose |
| Anti user-enumeration | Mismo `401 Credenciales inválidas` para email inexistente y clave errada |
| Tokens fuera del alcance de JS | Cookies `httpOnly: true` (inmunes a XSS), nunca `localStorage` ni body |
| Cookies endurecidas | `secure` en producción, `sameSite: 'lax'`, `Path=/api/v1/auth` para el refresh |
| Secretos separados | `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`, ambos en `.env` |
| Refresh revocable | Solo se guarda el **hash** del refresh token en `user.refreshToken` (`select: false`) |
| Rotación | Cada `/auth/refresh` emite tokens nuevos e inutiliza los anteriores |
| Unicidad de tokens | `jti` (UUID) en cada token firmado |
| Validación de entrada | Zod con `.strict()` → rechaza campos no declarados (anti mass-assignment) |
| Errores seguros | El handler global nunca expone stack traces ni detalles internos |
| Payload limitado | `express.json({ limit: '10kb' })` |

> **Nota de seguridad (OWASP A02 — Cryptographic Failures):** el hash del refresh
> token se calcula como `bcrypt(SHA256(token))`. bcrypt solo procesa los primeros
> **72 bytes** de su entrada y un JWT es mucho más largo, por lo que hashear el
> token completo hacía que `bcrypt.compare()` aceptara un token **ya rotado**
> (dos JWT del mismo usuario comparten ese prefijo). Ver `src/utils/tokenHash.ts`.

---

## ▶️ Cómo ejecutar

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env
# Genera secretos reales y distintos:
#   openssl rand -base64 64   → JWT_ACCESS_SECRET
#   openssl rand -base64 64   → JWT_REFRESH_SECRET

# 3. Base de datos
docker compose up -d

# 4. Datos de demostración (2 usuarios + 6 máquinas)
pnpm seed

# 5. Servidor de desarrollo
pnpm dev            # http://localhost:3000

# 6. Prueba automática del flujo completo (en otra terminal)
pnpm test:flow
```

### Usuarios del seed

| Rol | Email | Contraseña |
|---|---|---|
| admin | `admin@vendmax.co` | `Admin1234!` |
| user | `operador@vendmax.co` | `Operador1234!` |

### Scripts disponibles

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor con recarga en caliente (tsx watch) |
| `pnpm build` / `pnpm start` | Compila a `dist/` y ejecuta el build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm seed` | Repuebla la base con datos de demostración |
| `pnpm test:flow` | 37 verificaciones end-to-end contra el servidor levantado |

---

## 🧪 Ejemplos con curl

```bash
BASE=http://localhost:3000/api/v1

# Registro
curl -i -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"tecnico@vendmax.co","password":"Vendmax2026!","name":"Técnico Ruta Norte"}'

# Login guardando cookies
curl -i -c cookies.txt -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"tecnico@vendmax.co","password":"Vendmax2026!"}'

# Ruta protegida
curl -b cookies.txt $BASE/auth/me

# Crear máquina
curl -i -b cookies.txt -X POST $BASE/machines -H 'Content-Type: application/json' \
  -d '{"code":"VM-010","model":"SnackMaster 3000","type":"snacks","location":"Sede Norte — Piso 1","slots":36}'

# Listar con filtros
curl -b cookies.txt "$BASE/machines?status=operativa&limit=5"

# Sin cookie → 401
curl -i $BASE/machines
```

---

## 🗂️ Estructura

```
src/
├── app.ts                        # Express, middlewares, montaje de routers
├── server.ts                     # connectDB + listen
├── lib/mongoose.ts               # Conexión
├── errors/AppError.ts            # Error operacional con statusCode
├── types/express.d.ts            # req.user tipado
├── utils/
│   ├── jwt.ts                    # sign/verify de access y refresh (con jti)
│   └── tokenHash.ts              # bcrypt(SHA256(token)) para el refresh
├── middlewares/
│   ├── auth.middleware.ts        # Verifica la cookie accessToken → req.user
│   ├── errorHandler.ts           # AppError / Zod / Mongoose / 11000 / 500
│   └── notFound.ts
├── schemas/
│   ├── auth.schema.ts
│   └── machine.schema.ts         # create / update / query (Zod .strict())
├── models/
│   ├── user.model.ts
│   └── machine.model.ts
├── repositories/
│   ├── users.repository.ts
│   └── machine.repository.ts
├── services/
│   ├── auth.service.ts
│   └── machine.service.ts        # Reglas de negocio del dominio
├── controllers/
│   ├── auth.controller.ts
│   └── machine.controller.ts
├── routes/
│   ├── auth.routes.ts
│   └── machine.routes.ts
└── scripts/
    ├── seed.ts                   # Datos de demostración
    └── test-flow.ts              # Prueba end-to-end
```

---

## 📦 Colecciones de pruebas

En `../../coleccion-api/` hay una colección lista para importar tanto en
**Thunder Client** como en **Postman**, con todos los endpoints y los casos de
error (401, 404, 409, 400) ya preparados.
