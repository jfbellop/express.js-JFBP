# Ejercicio 01 — Registro y Login con JWT

## 🎯 Objetivo

Implementar un sistema de autenticación básico con:

- Registro de usuarios con contraseña hasheada (bcrypt)
- Login que devuelve un access token en cookie HttpOnly
- Ruta protegida `GET /auth/me` que requiere JWT válido

## 🗂️ Estructura del Starter

```
starter/
├── src/
│   ├── lib/mongoose.ts               # connectDB — DADO
│   ├── models/user.model.ts          # ← PASO 1: Schema de Usuario
│   ├── schemas/auth.schema.ts        # Zod: registerSchema, loginSchema — DADO
│   ├── utils/jwt.ts                  # ← PASO 3: signAccessToken
│   ├── repositories/users.repo.ts   # findByEmail, create — DADO
│   ├── services/auth.service.ts      # ← PASO 2: hash + compare
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # ← PASO 4: verifica JWT de cookie
│   │   ├── errorHandler.ts           # DADO
│   │   └── notFound.ts               # DADO
│   ├── controllers/auth.controller.ts  # DADO
│   ├── routes/
│   │   ├── auth.routes.ts            # ← PASO 5: proteger GET /me
│   │   └── index.ts                  # DADO
│   ├── types/express.d.ts            # DADO: extensión de req.user
│   ├── app.ts                        # DADO
│   └── server.ts                     # DADO
├── .env.example
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## 📋 Pasos

### Paso 1 — Definir el Schema de Usuario

Abre `src/models/user.model.ts` y descomenta el Schema de Mongoose con bcrypt.

Verifica que incluya: `email` (unique, lowercase), `password` (select: false), `name`, `role` (enum: user/admin, default: user), y `timestamps: true`.

### Paso 2 — Hashear y comparar contraseñas en el Service

Abre `src/services/auth.service.ts` y descomenta:
- En `register`: la llamada a `bcrypt.hash(password, 10)` antes de guardar el usuario
- En `login`: la llamada a `bcrypt.compare(dto.password, user.password)`

### Paso 3 — Implementar la firma del token

Abre `src/utils/jwt.ts` y descomenta la función `signAccessToken`.

Verifica que use `process.env.JWT_ACCESS_SECRET` y `expiresIn: '15m'`.

### Paso 4 — Implementar el middleware de autenticación

Abre `src/middlewares/auth.middleware.ts` y descomenta el cuerpo del middleware.

El middleware debe:
1. Leer `req.cookies.accessToken`
2. Si no existe → `next(new AppError(401, 'No autenticado'))`
3. Llamar a `verifyAccessToken(token)` en un try/catch
4. Asignar el resultado a `req.user` y llamar a `next()`

### Paso 5 — Proteger la ruta GET /me

Abre `src/routes/auth.routes.ts` y descomenta la línea que añade `authMiddleware` a la ruta `GET /me`.

## ▶️ Cómo Ejecutar

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar MongoDB con Docker
docker-compose up -d

# 4. Iniciar servidor
pnpm dev
```

## 🧪 Probar con Thunder Client / Postman

### 1. Registrar un usuario
```
POST http://localhost:3000/api/v1/auth/register
Body (JSON): { "email": "test@test.com", "password": "Test1234!", "name": "Test User" }
Esperado: 201 Created { id, email, name, role }
```

### 2. Hacer login
```
POST http://localhost:3000/api/v1/auth/login
Body (JSON): { "email": "test@test.com", "password": "Test1234!" }
Esperado: 200 OK { id, email, name, role }
             Set-Cookie: accessToken=eyJ...; HttpOnly
```

### 3. Acceder a ruta protegida (con cookie activa)
```
GET http://localhost:3000/api/v1/auth/me
Cookie: (se envía automáticamente si usas el mismo cliente)
Esperado: 200 OK { id, email, name, role }
```

### 4. Sin cookie activa
```
GET http://localhost:3000/api/v1/auth/me
Sin cookie
Esperado: 401 { message: 'No autenticado' }
```
