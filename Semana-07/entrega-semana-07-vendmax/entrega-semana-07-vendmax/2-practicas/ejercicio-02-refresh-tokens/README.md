# Ejercicio 02 — Refresh Tokens con Rotación

## 🎯 Objetivo

Extender el sistema de autenticación del Ejercicio 01 añadiendo:

- Refresh token de larga duración (7 días) almacenado en cookie HttpOnly
- Hash del refresh token guardado en el documento del usuario (para revocación)
- `POST /auth/refresh` que rota ambos tokens
- `POST /auth/logout` que invalida el refresh token y limpia las cookies

## 🗂️ Estructura del Starter

```
starter/
├── src/
│   ├── models/user.model.ts          # ← PASO 1: añadir campo refreshToken
│   ├── utils/jwt.ts                  # ← PASO 2: signRefreshToken + verify
│   ├── services/auth.service.ts      # ← PASO 3: login guarda hash, + refresh() + logout()
│   ├── controllers/auth.controller.ts  # ← PASO 4: refresh y logout controllers
│   ├── routes/auth.routes.ts         # ← PASO 5: POST /refresh y POST /logout
│   └── (resto: dado, igual a ejercicio-01)
```

## 📋 Pasos

### Paso 1 — Añadir campo refreshToken al Schema

Abre `src/models/user.model.ts` y descomenta el campo `refreshToken` en el Schema.

Este campo almacenará el **hash bcrypt** del refresh token (nunca el token en texto plano).

### Paso 2 — Firmar y verificar el refresh token

Abre `src/utils/jwt.ts` y descomenta `signRefreshToken` y `verifyRefreshToken`.

Usa `JWT_REFRESH_SECRET` (distinto al de acceso) y `expiresIn: '7d'`.

### Paso 3 — Actualizar el Service

Abre `src/services/auth.service.ts` y descomenta:
- En `login`: generar refresh token, hashear con bcrypt y guardarlo en `user.refreshToken`
- Función `refresh()`: verificar JWT del refresh token + comparar hash + rotar
- Función `logout()`: limpiar `user.refreshToken` en DB

### Paso 4 — Implementar los Controllers

Abre `src/controllers/auth.controller.ts` y descomenta los handlers `refresh` y `logout`.

El controller de refresh debe:
1. Leer `req.cookies.refreshToken`
2. Llamar a `authService.refresh(refreshToken)`
3. Setear los nuevos tokens como cookies

### Paso 5 — Registrar las nuevas rutas

Abre `src/routes/auth.routes.ts` y descomenta las rutas:
- `POST /refresh` → `authController.refresh`
- `POST /logout` → `authMiddleware, authController.logout`

## ▶️ Cómo Ejecutar

```bash
pnpm install
cp .env.example .env    # asegúrate de que JWT_REFRESH_SECRET esté definido
docker-compose up -d
pnpm dev
```

## 🧪 Probar con Thunder Client / Postman

### 1. Login (ahora retorna dos cookies)
```
POST http://localhost:3000/api/v1/auth/login
Body: { "email": "test@test.com", "password": "Test1234!" }
Esperado: Set-Cookie: accessToken + Set-Cookie: refreshToken
```

### 2. Esperar a que el access token expire (o modificarlo manualmente) y renovar
```
POST http://localhost:3000/api/v1/auth/refresh
Cookie: refreshToken=eyJ...
Esperado: 200 OK — nuevas cookies con access y refresh token
```

### 3. Logout
```
POST http://localhost:3000/api/v1/auth/logout
Cookie: accessToken=eyJ...
Esperado: 200 OK — ambas cookies eliminadas
```

### 4. Intentar refresh después de logout (debe fallar)
```
POST http://localhost:3000/api/v1/auth/refresh
Cookie: refreshToken=eyJ...  (el anterior, ya invalidado en DB)
Esperado: 401 Refresh token inválido
```
