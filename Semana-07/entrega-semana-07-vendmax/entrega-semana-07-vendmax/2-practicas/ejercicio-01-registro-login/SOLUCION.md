# Solución — Ejercicio 01: Registro y Login con JWT

## ✅ Pasos completados

| Paso | Archivo | Qué se implementó |
|---|---|---|
| 1 | `src/models/user.model.ts` | Schema `User` con `email` (unique, lowercase), `password` (`select: false`, min 8), `name`, `role` (enum `user`/`admin`, default `user`) y `timestamps: true` |
| 2a | `src/services/auth.service.ts` | `bcrypt.hash(password, 10)` antes de guardar (asíncrono, nunca `hashSync`) |
| 2b | `src/services/auth.service.ts` | `bcrypt.compare()` en el login + mismo mensaje de error en ambos fallos |
| 3 | `src/utils/jwt.ts` | `signAccessToken` / `verifyAccessToken` con `JWT_ACCESS_SECRET` y `expiresIn: '15m'` |
| 4 | `src/middlewares/auth.middleware.ts` | Lee `req.cookies.accessToken`, 401 si falta, verifica en try/catch, distingue `TokenExpiredError`, inyecta `req.user` |
| 5 | `src/routes/auth.routes.ts` | `GET /me` protegida con `authMiddleware` |

## 🔧 Ajustes necesarios sobre el starter

1. **Falta `dotenv`**: `src/server.ts` hace `import 'dotenv/config'` pero la dependencia
   no estaba en `package.json` → el servidor no arrancaba. Se agregó `dotenv: 16.5.0`.
2. **`user.toObject() as Record<string, unknown>` no compila** con el modelo tipado
   (`TS2352`). Se reemplazó por destructuring, que además garantiza que el hash nunca
   salga en la respuesta:
   ```ts
   const { password: _password, ...safeUser } = user.toObject();
   return safeUser;
   ```
3. Se añadió el script `pnpm test:flow` (`src/scripts/test-flow.ts`) que verifica
   automáticamente los casos de la guía.

## ▶️ Ejecutar

```bash
pnpm install
cp .env.example .env     # define JWT_ACCESS_SECRET
docker compose up -d
pnpm dev                 # terminal A
pnpm test:flow           # terminal B
```

## 🧪 Resultado de la prueba automática

```
1. Registro
  ✅ POST /auth/register → 201
  ✅ La respuesta no incluye el campo password
  ✅ La contraseña se guardó hasheada (no aparece en claro)
  ✅ Email duplicado → 409
  ✅ Contraseña que no cumple la política → 400

2. Login
  ✅ POST /auth/login → 200
  ✅ Set-Cookie accessToken presente
  ✅ La cookie es HttpOnly
  ✅ La cookie declara SameSite
  ✅ El token NO viaja en el body
  ✅ Contraseña incorrecta → 401
  ✅ Email inexistente → 401
  ✅ Mismo mensaje en ambos casos (anti user-enumeration)

3. Ruta protegida GET /auth/me
  ✅ Con cookie válida → 200
  ✅ Devuelve el usuario sin password
  ✅ Sin cookie → 401
  ✅ Con token manipulado → 401

RESULTADO: 17 OK, 0 fallidas
```

## 📋 Cobertura de la rúbrica (20 pts)

| Criterio | Pts | Dónde |
|---|---|---|
| Schema `User` con `password: { select: false }` | 3 | `models/user.model.ts` |
| `bcrypt.hash()` con salt rounds ≥ 10 | 3 | `services/auth.service.ts` (`SALT_ROUNDS = 10`) |
| `bcrypt.compare()` en login | 3 | `services/auth.service.ts` |
| Access token con `jwt.sign()` y 15 min | 3 | `utils/jwt.ts` (`ACCESS_TOKEN_TTL = '15m'`) |
| Cookie `httpOnly: true` | 3 | `controllers/auth.controller.ts` (`COOKIE_BASE`) |
| `authMiddleware` lee y verifica la cookie | 3 | `middlewares/auth.middleware.ts` |
| `GET /auth/me` sin password | 2 | `routes/auth.routes.ts` + `select: false` |
