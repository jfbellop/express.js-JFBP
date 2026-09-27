# Ejercicio 01 — RBAC: Roles y Autorización

## 🎯 Objetivo

Implementar `requireRole()` como middleware de Express y proteger rutas según el rol del usuario (`user` o `admin`). El sistema de autenticación está dado — el enfoque es la **capa de autorización**.

---

## 📋 Descripción

Tienes una API Express con autenticación JWT ya implementada (semana 07). En este ejercicio completarás la capa de autorización:

- Descomentarás el campo `role` en el payload JWT
- Implementarás el middleware `requireRole(...roles)`
- Aplicarás los middlewares a las rutas correctas

---

## 🗂️ Estructura del Starter

```
starter/
├── src/
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # DADO — authMiddleware completo
│   │   └── requireRole.ts        # PASO 1 — implementar requireRole
│   ├── utils/
│   │   └── jwt.ts                # PASO 2 — agregar role al payload
│   ├── services/
│   │   └── auth.service.ts       # PASO 3 — incluir role en token
│   ├── routes/
│   │   ├── auth.routes.ts        # DADO
│   │   ├── user.routes.ts        # DADO — rutas para todos los autenticados
│   │   └── admin.routes.ts       # PASO 4 — aplicar requireRole
│   └── ...
```

---

## 🚀 Setup

```bash
cd starter
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

---

## 📝 Pasos del Ejercicio

### PASO 1 — Implementar `requireRole()`

Abre `src/middlewares/requireRole.ts`. Implementa la higher-order function que devuelve un middleware.

El middleware debe:
- Verificar que `req.user` existe (si no, 401)
- Verificar que `req.user.role` está en la lista de roles permitidos (si no, 403)
- Llamar a `next()` si todo está bien

**Abre `starter/src/middlewares/requireRole.ts`** y descomenta la implementación.

---

### PASO 2 — Agregar `role` al tipo `JwtPayload`

Abre `src/utils/jwt.ts`. El tipo `JwtPayload` debe incluir el campo `role`.

**Abre `starter/src/utils/jwt.ts`** y descomenta la propiedad `role` en la interfaz.

---

### PASO 3 — Incluir `role` al firmar el access token

Abre `src/services/auth.service.ts`. En la función `login`, el payload del `signAccessToken` debe incluir el `role` del usuario.

**Abre `starter/src/services/auth.service.ts`** y descomenta la línea con `role: user.role`.

---

### PASO 4 — Proteger las rutas de admin

Abre `src/routes/admin.routes.ts`. Aplica `authMiddleware` y `requireRole('admin')` a todas las rutas del router.

**Abre `starter/src/routes/admin.routes.ts`** y descomenta los middlewares.

---

## ✅ Casos de Prueba (Thunder Client / Postman)

### 1. Login como `user`
```
POST http://localhost:3000/api/v1/auth/login
Body: { "email": "user@test.com", "password": "User1234!" }
Esperado: 200 OK + cookie accessToken
```

### 2. Acceder a ruta de usuario (debe funcionar)
```
GET http://localhost:3000/api/v1/dashboard
Cookie: (la que recibiste en el login)
Esperado: 200 OK
```

### 3. Acceder a ruta de admin con rol `user` (debe fallar)
```
GET http://localhost:3000/api/v1/admin/users
Cookie: (la que recibiste en el login de user)
Esperado: 403 Forbidden
```

### 4. Login como `admin`
```
POST http://localhost:3000/api/v1/auth/login
Body: { "email": "admin@test.com", "password": "Admin1234!" }
Esperado: 200 OK + cookie accessToken
```

### 5. Acceder a ruta de admin con rol `admin` (debe funcionar)
```
GET http://localhost:3000/api/v1/admin/users
Cookie: (la que recibiste en el login de admin)
Esperado: 200 OK
```

### 6. Acceder sin token (debe fallar)
```
GET http://localhost:3000/api/v1/dashboard
Sin cookie
Esperado: 401 Unauthorized
```

---

## 💡 Hints

- `requireRole` debe ser una función que devuelve un middleware (higher-order function)
- `req.user` es inyectado por `authMiddleware` — `requireRole` siempre va después
- 401 = no autenticado, 403 = autenticado pero sin permisos
- El `role` viaja en el payload del JWT — asegúrate de incluirlo al firmar
