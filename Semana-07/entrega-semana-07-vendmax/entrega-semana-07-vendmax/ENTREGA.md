# Entrega — Semana 07: Autenticación con JWT

**Dominio asignado:** Máquinas Expendedoras · **Proyecto:** VendMax API
**Stack:** Node 22 · Express 5 · TypeScript · MongoDB + Mongoose · Zod · bcrypt · jsonwebtoken

---

## 📦 Qué contiene esta entrega

```
week-07-autenticacion_jwt/
├── ENTREGA.md                      ← este archivo
├── cuestionario-conocimiento.md    ← evidencia de Conocimiento (30%): 10 preguntas
├── 2-practicas/
│   ├── ejercicio-01-registro-login/
│   │   ├── SOLUCION.md             ← qué se hizo paso a paso + resultados
│   │   └── starter/                ← código completo y funcionando
│   └── ejercicio-02-refresh-tokens/
│       ├── SOLUCION.md
│       └── starter/
├── 3-proyecto/
│   ├── README.md                   ← enunciado original del bootcamp
│   └── starter/
│       ├── README.md               ← README personalizado del proyecto (rúbrica: 10 pts)
│       └── src/                    ← VendMax API completa
├── coleccion-api/                  ← colecciones Thunder Client + Postman (20 requests)
└── evidencias/                     ← salidas reales de las pruebas automáticas
```

---

## ✅ Estado: los 3 entregables funcionando y verificados

| Entregable | Pruebas automáticas | Estado |
|---|---|---|
| Ejercicio 01 — Registro y login | 17 verificaciones | ✅ 17/17 |
| Ejercicio 02 — Refresh tokens con rotación | 20 verificaciones | ✅ 20/20 |
| Proyecto — VendMax API | 37 verificaciones | ✅ 37/37 |

Las salidas completas están en `evidencias/`. Cada proyecto trae el script
`pnpm test:flow`, que levanta el escenario completo contra el servidor y reporta
PASS/FAIL por caso (registro, login, cookies HttpOnly, 401 sin token, CRUD,
404/409/400, rotación de refresh, logout e invalidación en DB).

`tsc --noEmit` pasa limpio en los tres proyectos.

---

## 🥤 El dominio: VendMax

Red de máquinas expendedoras (snacks, bebidas, café) instaladas en universidades,
hospitales, centros empresariales y terminales.

**Recurso principal:** `Machine` → `/api/v1/machines`
Campos: `code` (único, `VM-001`), `model`, `type`, `location`, `status`, `slots`,
`temperatureC`, `cashBalanceCents`, `lastRestockedAt`, `notes`, `createdBy`.

**Reglas de negocio implementadas** (no es un CRUD genérico):

1. El `code` es irrepetible en toda la red → `409`.
2. Una máquina `fuera_de_servicio` no vuelve a `operativa` sin pasar por `mantenimiento` → `409`.
3. No se puede eliminar una máquina con recaudo pendiente (`cashBalanceCents > 0`) → `409`.
4. Una máquina de `snacks` no acepta `temperatureC` → `422`.

---

## 🐛 Tres bugs reales encontrados al probar (y cómo se corrigieron)

> Esto no salió en la guía: apareció al ejecutar el flujo completo de verdad.

### 1. La rotación de refresh tokens no rotaba nada

Dos JWT firmados **en el mismo segundo** con el mismo payload son la **misma
cadena** (el claim `iat` está en segundos). El `/auth/refresh` devolvía un token
idéntico al anterior.
**Fix:** `jti` (UUID aleatorio) en cada token firmado → `src/utils/jwt.ts`.

### 2. bcrypt validaba un refresh token YA ROTADO

Con tokens ya distintos, reutilizar el viejo seguía dando `200`. Causa:
**bcrypt solo procesa los primeros 72 bytes** de su entrada, y dos JWT del mismo
usuario comparten los primeros ~90 caracteres (header idéntico + mismo `sub`).
`bcrypt.compare()` no llegaba a mirar la parte que los diferencia.
**Fix:** hashear un digest SHA-256 del token → `bcrypt(SHA256(token))`, 44
caracteres que sí caben completos → `src/utils/tokenHash.ts`.
Es una vulnerabilidad real: sin esto, un refresh token robado sigue sirviendo
después de rotar.

### 3. `.partial()` de Zod conserva los `.default()`

En el PATCH del recurso, `updateMachineSchema.safeParse({ cashBalanceCents: 50000 })`
devolvía además `{ status: 'operativa' }`, y un PATCH de `{ status }` **reseteaba
el recaudo a 0**: una actualización parcial pisaba datos reales.
**Fix:** el objeto base no lleva defaults; los defaults se agregan solo en el
schema de creación → `src/schemas/machine.schema.ts`.

---

## 🔧 Ajustes al starter del bootcamp

| Ajuste | Por qué |
|---|---|
| `dotenv` agregado a `package.json` de ambos ejercicios | `server.ts` hace `import 'dotenv/config'` pero la dependencia no estaba declarada → el servidor no arrancaba |
| `user.toObject() as Record<string, unknown>` → destructuring | No compila con el modelo tipado (`TS2352`); el destructuring además garantiza que el hash nunca salga |
| `FilterQuery` → `QueryFilter` | En Mongoose 9 el tipo se renombró |
| `new: true` → `returnDocument: 'after'` | `new` quedó deprecado en Mongoose 9 (warning en consola) |
| `errorHandler` del proyecto ampliado | Traduce ZodError → 400, ValidationError → 400, CastError → 400, E11000 → 409; antes cualquiera de esos caía en un **500** |
| `safeParse` en vez de `parse` en el controlador del recurso | Devuelve 400 con el detalle en vez de dejar escapar el error al 500 |
| Endpoint `GET /api/v1/health` | Verificación rápida de que la API está viva (y base para la semana 08) |

---

## ▶️ Cómo ejecutar cada entregable

```bash
cd <carpeta>/starter
pnpm install
cp .env.example .env        # genera secretos: openssl rand -base64 64
docker compose up -d        # MongoDB
pnpm dev                    # terminal A  → http://localhost:3000
pnpm test:flow              # terminal B  → verificación automática
```

Solo en el proyecto: `pnpm seed` crea 2 usuarios y 6 máquinas de demostración.

| Rol | Email | Contraseña |
|---|---|---|
| admin | `admin@vendmax.co` | `Admin1234!` |
| user | `operador@vendmax.co` | `Operador1234!` |

> ⚠️ Cada carpeta trae un `.env` de desarrollo listo para usar (con secretos
> aleatorios ya generados) y un `.gitignore` que lo excluye del repositorio.

---

## 📸 Screenshots que faltan por capturar (los pide la rúbrica)

Con la colección de `coleccion-api/` importada, capturar:

- [ ] `POST /auth/register` → 201 con el usuario creado (sin `password`)
- [ ] `POST /auth/login` → 200 y la pestaña **Cookies/Headers** mostrando
      `Set-Cookie: accessToken=...; HttpOnly` y `refreshToken=...; HttpOnly; Path=/api/v1/auth`
- [ ] `GET /auth/me` → 200
- [ ] `GET /machines` **sin cookie** → 401
- [ ] CRUD completo: crear (201), listar (200), detalle (200), actualizar (200), eliminar (204)
- [ ] `POST /auth/refresh` → 200 con cookies nuevas
- [ ] `POST /auth/logout` → 200 y luego `/auth/refresh` → 401

---

## 📋 Autoevaluación contra la rúbrica (Producto, 100 pts)

| Criterio | Pts | Evidencia |
|---|---|---|
| Schema `User` coherente con el dominio | 10 | `models/user.model.ts` |
| Contraseña hasheada con bcrypt (rounds ≥ 10) | 10 | `auth.service.ts` → `SALT_ROUNDS = 10` |
| Login con `bcrypt.compare` y mismo mensaje de error | 10 | Verificado en `test-flow` (anti user-enumeration) |
| Access token ≤ 15 min | 5 | `utils/jwt.ts` → `expiresIn: '15m'` |
| Refresh con secreto distinto y ≥ 1d | 5 | `JWT_REFRESH_SECRET`, `expiresIn: '7d'` |
| Cookies `httpOnly`, `secure`, `sameSite` | 10 | `auth.controller.ts` → `setCookieOptions()` |
| `authMiddleware` protege rutas del dominio | 10 | `machine.routes.ts` → `router.use(authMiddleware)` |
| `/auth/refresh` con rotación funcional | 8 | Verificado: token viejo → 401 |
| `/auth/logout` limpia cookies e invalida en DB | 7 | Verificado: refresh posterior → 401 |
| Secretos en variables de entorno | 5 | `.env` + `.env.example`, nada hardcodeado |
| Dominio propio | 10 | VendMax, reglas de negocio propias |
| README con descripción e instrucciones | 10 | `3-proyecto/starter/README.md` |

**Sin penalizaciones:** no hay contraseñas en claro, ni secretos hardcodeados, ni
tokens en `localStorage`, ni cookies sin `httpOnly`, ni secreto compartido entre
access y refresh, ni `bcrypt.hashSync`.

---

## ➡️ Siguiente

Semana 08 — Autorización y Seguridad (RBAC con `requireRole`, Helmet, CORS con
whitelist, rate limiting y sanitización). El proyecto de VendMax continúa ahí:
el modelo `User` ya tiene el campo `role` y el `role` ya viaja dentro del JWT.
