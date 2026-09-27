# 🚀 Proyecto Semanal: API con Autenticación JWT Completa

## 🎯 Objetivo

Implementar un sistema de autenticación completo con **bcrypt**, **JWT access/refresh tokens** y **cookies HttpOnly**, aplicado al dominio que el instructor te asignó. La API protegerá un recurso principal de tu dominio con rutas privadas.

---

## 📋 Tu Dominio Asignado

> **Dominio**: El instructor te asignará tu dominio único al inicio del bootcamp.

Dependiendo de tu dominio, tu recurso principal será diferente:

| Dominio | Recurso principal | Ejemplos de campos |
|---------|-------------------|-------------------|
| Biblioteca | Libro | título, autor, ISBN, disponible |
| Farmacia | Medicamento | nombre, principio activo, stock, precio |
| Gimnasio | Miembro | nombre, plan, fechaVencimiento |
| Restaurante | Platillo | nombre, descripción, precio, categoría |
| Hospital | Paciente | nombre, diagnóstico, médico asignado |
| Hotel | Habitación | número, tipo, precio, disponible |
| Tienda de mascotas | Producto | nombre, especie, categoría, precio |
| Escuela | Alumno | nombre, grado, tutor, activo |

---

## ✅ Requisitos Funcionales

### Autenticación (obligatorio — ya implementado en el starter)

- `POST /api/v1/auth/register` — registro con hash de contraseña
- `POST /api/v1/auth/login` — login que emite access + refresh token en cookies HttpOnly
- `GET /api/v1/auth/me` — perfil del usuario autenticado (ruta protegida)
- `POST /api/v1/auth/refresh` — renueva access token usando refresh token con rotación
- `POST /api/v1/auth/logout` — invalida refresh token y limpia cookies

### CRUD del Recurso Principal (debes implementar)

1. **Listar recursos** — `GET /api/v1/<recursos>` — solo usuarios autenticados
2. **Obtener recurso** — `GET /api/v1/<recursos>/:id` — devuelve 404 si no existe
3. **Crear recurso** — `POST /api/v1/<recursos>` — valida con Zod, devuelve 201
4. **Actualizar recurso** — `PATCH /api/v1/<recursos>/:id` — actualización parcial
5. **Eliminar recurso** — `DELETE /api/v1/<recursos>/:id` — devuelve 204

Todas las rutas del recurso deben estar **protegidas** con `authMiddleware`.

---

## 💡 Ejemplos de Adaptación por Dominio

### Biblioteca → Libros

```typescript
// src/models/book.model.ts
interface IBook {
  title: string;
  author: string;
  isbn: string;
  available: boolean;
  addedBy: mongoose.Types.ObjectId; // referencia al usuario
}
```

### Farmacia → Medicamentos

```typescript
// src/models/medication.model.ts
interface IMedication {
  name: string;
  activeIngredient: string;
  stock: number;
  price: number;
  requiresPrescription: boolean;
}
```

### Gimnasio → Miembros

```typescript
// src/models/member.model.ts
interface IMember {
  fullName: string;
  plan: 'basic' | 'premium' | 'vip';
  expiresAt: Date;
  active: boolean;
  registeredBy: mongoose.Types.ObjectId;
}
```

---

## 🗂️ Estructura del Starter

```
starter/
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml
└── src/
    ├── app.ts                          # DADO — monta auth + resource router
    ├── server.ts                       # DADO — connectDB + listen
    ├── lib/
    │   └── mongoose.ts                 # DADO — connectDB/disconnectDB
    ├── errors/
    │   └── AppError.ts                 # DADO — clase de error con statusCode
    ├── types/
    │   └── express.d.ts                # DADO — req.user tipado globalmente
    ├── utils/
    │   └── jwt.ts                      # DADO — sign/verify access + refresh
    ├── middlewares/
    │   ├── auth.middleware.ts           # DADO — authMiddleware implementado
    │   ├── errorHandler.ts             # DADO
    │   └── notFound.ts                 # DADO
    ├── schemas/
    │   ├── auth.schema.ts              # DADO — register/login Zod schemas
    │   └── resource.schema.ts          # TODO — schema de tu recurso
    ├── models/
    │   ├── user.model.ts               # TODO — adaptar roles si tu dominio lo requiere
    │   └── resource.model.ts           # TODO — modelo de tu recurso principal
    ├── repositories/
    │   ├── users.repository.ts         # DADO — operaciones de usuario
    │   └── resource.repository.ts     # TODO — operaciones de tu recurso
    ├── services/
    │   ├── auth.service.ts             # DADO — register/login/refresh/logout/getMe
    │   └── resource.service.ts        # TODO — lógica de negocio del recurso
    ├── controllers/
    │   ├── auth.controller.ts          # DADO — handlers de auth
    │   └── resource.controller.ts     # TODO — handlers del recurso
    └── routes/
        ├── auth.routes.ts              # DADO — rutas de auth completas
        └── resource.routes.ts         # TODO — rutas CRUD del recurso
```

---

## 🛠️ Instrucciones de Implementación

### Paso 1 — Configurar el entorno

```bash
cd starter
pnpm install
cp .env.example .env
# Editar .env con tus valores:
# JWT_ACCESS_SECRET=<genera con: openssl rand -base64 64>
# JWT_REFRESH_SECRET=<genera con: openssl rand -base64 64>
docker compose up -d
```

### Paso 2 — Adaptar el modelo de usuario (opcional)

Abre `src/models/user.model.ts`. Si tu dominio requiere roles específicos, adapta el enum `role`. Si no, el modelo funciona tal cual.

### Paso 3 — Implementar el modelo del recurso

Abre `src/models/resource.model.ts`. Implementa la interfaz y el schema de Mongoose para tu recurso principal. Cambia el nombre del archivo al recurso real (ej. `book.model.ts`).

### Paso 4 — Implementar el schema Zod

Abre `src/schemas/resource.schema.ts`. Crea los schemas `createResourceSchema` y `updateResourceSchema` usando Zod con validaciones apropiadas para tu dominio.

### Paso 5 — Implementar el repositorio

Abre `src/repositories/resource.repository.ts`. Cada función tiene un `// TODO` con instrucciones. Implementa las consultas de Mongoose.

### Paso 6 — Implementar el servicio

Abre `src/services/resource.service.ts`. Llama al repositorio y aplica la lógica de negocio de tu dominio (validaciones, transformaciones, etc.).

### Paso 7 — Implementar el controlador

Abre `src/controllers/resource.controller.ts`. Conecta los servicios con la capa HTTP: maneja `req`/`res`, valida con Zod y delega al servicio.

### Paso 8 — Implementar las rutas

Abre `src/routes/resource.routes.ts`. Define las 5 rutas CRUD protegidas con `authMiddleware`.

### Paso 9 — Registrar el router en app.ts

`src/app.ts` ya incluye un comentario donde montar tu router. Descomenta la línea con `resourceRouter`.

### Paso 10 — Probar con Thunder Client / Postman

Sigue el flujo completo:
1. Registrar usuario → Login → obtener cookies
2. Crear recurso → listar → obtener por ID → actualizar → eliminar
3. Intentar acceder sin cookie → verificar 401
4. Usar refresh → obtener nuevo access token → continuar operando

---

## 📸 Entregables

1. **API funcional** con todos los endpoints respondiendo correctamente
2. **Screenshots** de Thunder Client / Postman mostrando:
   - Register exitoso
   - Login con cookies en la respuesta
   - CRUD completo del recurso (5 operaciones)
   - Acceso sin token → 401
   - Refresh exitoso → nuevo cookie
   - Logout y refresh posterior → 401
3. **Código fuente** con tu dominio aplicado (no el nombre genérico `resource`)
4. **README** actualizado con tu dominio y descripción de tu recurso

---

## 🔐 Criterios de Seguridad Obligatorios

| Criterio | Descripción |
|----------|-------------|
| Contraseñas hasheadas | `bcrypt.hash()` con salt rounds 10 |
| Secrets distintos | `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET` |
| Tokens en cookies HttpOnly | Nunca en `localStorage` ni en body |
| Refresh token hasheado en DB | Solo el hash se almacena, no el token en claro |
| Rotación de refresh token | Cada `/refresh` invalida el anterior |
| Rutas protegidas | Todas las rutas del recurso usan `authMiddleware` |
| Sin secrets hardcodeados | Solo en `.env`, nunca en el código |

---

## 🔗 Navegación

← [Semana 06: MongoDB + Mongoose](../../week-06/README.md) | [Semana 08: Autorización y Seguridad →](../../week-08/README.md)
