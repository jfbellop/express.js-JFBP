# Ejercicio 01 — Control de acceso por roles (RBAC)

**Semana 08 · Autorización y Seguridad** · Carpeta del código: [`starter/`](./starter)

Resultado de la verificación automática: **26 / 26 pruebas OK**
(salida completa en [`../../evidencias/ejercicio-01-rbac-test-flow.txt`](../../evidencias/ejercicio-01-rbac-test-flow.txt))

---

## 1. Qué pedía el ejercicio

| Paso | Requisito | Archivo |
|------|-----------|---------|
| 1 | `requireRole(...roles)` como *higher-order function* | `src/middlewares/requireRole.ts` |
| 2 | Añadir `role` a `JwtPayload` y firmarlo en el login | `src/utils/jwt.ts`, `src/services/auth.service.ts` |
| 3 | Controlador de administración | `src/controllers/admin.controller.ts` |
| 4 | Rutas `/admin/*` protegidas con `authMiddleware` + `requireRole('admin')` | `src/routes/admin.routes.ts` |
| 5 | Ruta pública sin token y ruta compartida por ambos roles | `src/routes/public.routes.ts`, `src/routes/user.routes.ts` |

---

## 2. La idea central: autenticación ≠ autorización

```
Petición
   │
   ├─ authMiddleware   → ¿QUIÉN eres?    lee el JWT y rellena req.user   → 401 si falla
   │
   └─ requireRole(...) → ¿PUEDES hacerlo? compara req.user.role          → 403 si falla
```

`401` y `403` no son intercambiables:

- **401 Unauthorized** = "no sé quién eres": falta el token, está caducado o es inválido.
  Se arregla iniciando sesión otra vez.
- **403 Forbidden** = "sé perfectamente quién eres y aun así no puedes".
  Reintentar el login no lo soluciona nunca.

Devolver 401 donde toca un 403 manda al cliente a un bucle de re-login inútil; devolver 403
donde toca un 401 impide que el frontend sepa que solo debe refrescar el token.

---

## 3. `requireRole` — el middleware

```ts
export function requireRole(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));

    if (!roles.includes(req.user.role as string)) {
      return next(new AppError(403, `Access denied. Required roles: ${roles.join(', ')}`));
    }

    next();
  };
}
```

Tres decisiones que conviene justificar:

1. **Higher-order function.** `requireRole` no es el middleware: *fabrica* el middleware.
   Por eso en la ruta se escribe `requireRole('admin')` (con paréntesis, invocándola) y no
   `requireRole`. Esto permite parametrizar la lista de roles: `requireRole('admin', 'auditor')`.
2. **Rest parameter `...roles`.** Un solo middleware sirve para uno o varios roles, y la
   comprobación es un `includes`, no una cadena de `if`.
3. **`next(new AppError(...))` en lugar de `res.status(403).json(...)`.** El error viaja al
   manejador global, que da formato uniforme a toda la API. Si cada middleware respondiera por
   su cuenta acabaríamos con cinco formatos de error distintos.

---

## 4. El rol viaja dentro del JWT

Sin esto el middleware no tiene nada que comparar:

```ts
// src/utils/jwt.ts
export interface JwtPayload {
  sub: string;
  email: string;
  role: string; // ← imprescindible para RBAC
}

// src/services/auth.service.ts — al hacer login
const accessToken = signAccessToken({
  sub: user._id.toString(),
  email: user.email,
  role: user.role, // ← se firma con el resto del payload
});
```

**Por qué el rol en el token y no una consulta a la base de datos en cada request:** el JWT va
firmado, así que el cliente no puede cambiar `"role": "user"` por `"role": "admin"` sin invalidar
la firma. Y evita un `findById` por cada petición.

**La contrapartida, que hay que conocer:** si un admin es degradado a usuario normal, su token
actual sigue diciendo `admin` hasta que expire (15 minutos en esta configuración). Ese es
justamente el motivo de que los access tokens sean de vida corta. Para revocación inmediata haría
falta una lista de revocación o tokens de sesión en Redis.

---

## 5. Mapa de rutas y accesos

| Método y ruta | Middlewares | user | admin | sin token |
|---------------|-------------|:----:|:-----:|:---------:|
| `GET /api/v1/public` | — | ✅ | ✅ | ✅ 200 |
| `GET /api/v1/health` | — | ✅ | ✅ | ✅ 200 |
| `POST /api/v1/auth/login` | — | ✅ | ✅ | ✅ 200 |
| `GET /api/v1/auth/me` | `authMiddleware` | ✅ | ✅ | ❌ 401 |
| `GET /api/v1/dashboard` | `authMiddleware` | ✅ | ✅ | ❌ 401 |
| `GET /api/v1/users/dashboard` | `authMiddleware` | ✅ | ✅ | ❌ 401 |
| `GET /api/v1/admin/users` | `authMiddleware` + `requireRole('admin')` | ❌ 403 | ✅ 200 | ❌ 401 |
| `GET /api/v1/admin/stats` | `authMiddleware` + `requireRole('admin')` | ❌ 403 | ✅ 200 | ❌ 401 |

`router.use(authMiddleware); router.use(requireRole('admin'));` se aplican a nivel de *router*, no
ruta por ruta: así una ruta nueva dentro de `/admin` **nace protegida**. Es el principio
*fail-safe defaults* — si alguien olvida el middleware, el fallo debe ser hacia el lado seguro.

> **Nota sobre `/dashboard`:** el enunciado la menciona sin prefijo `users`, mientras que el
> starter la sitúa en `/users/dashboard`. Se registró un alias para que ambas rutas funcionen y
> ninguna verificación del evaluador falle por la ruta.

---

## 6. Verificación

```bash
cd starter
pnpm install
pnpm mongo      # terminal 1 — MongoDB local sin Docker
pnpm seed       # terminal 2 — crea user@test.com y admin@test.com
pnpm dev        # terminal 2
pnpm test:flow  # terminal 3 — 26 comprobaciones automáticas
```

Comprobaciones incluidas (extracto):

```
2. Ruta protegida sin token
  ✅ GET /admin/users sin token → 401
  ✅ El error no dice si el usuario existe

3. Login como user y como admin
  ✅ El JWT de user lleva role=user
  ✅ El JWT de admin lleva role=admin

4. RBAC en acción
  ✅ user   → GET /admin/users  → 403
  ✅ admin  → GET /admin/users  → 200
  ✅ user   → GET /dashboard    → 200
  ✅ admin  → GET /dashboard    → 200
```

Prueba manual equivalente con curl:

```bash
# token de un usuario normal
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"User1234!"}' | jq -r .accessToken)

curl -i http://localhost:3000/api/v1/admin/users -H "Authorization: Bearer $TOKEN"
# HTTP/1.1 403 Forbidden
# {"error":"Access denied. Required roles: admin"}
```

---

## 7. Errores que este ejercicio enseña a evitar

| Error | Consecuencia |
|-------|--------------|
| `router.use(requireRole('admin'))` **antes** de `authMiddleware` | `req.user` siempre vacío → 401 para todos, incluido el admin |
| Comprobar el rol dentro del controlador (`if (req.user.role !== 'admin')`) | Lógica de seguridad duplicada y dispersa; la rúbrica lo penaliza con −10 |
| Confiar en un `role` enviado por el cliente en el body o en un header | Escalada de privilegios trivial: basta con mandar `role: admin` |
| No incluir `role` en el payload del JWT | `requireRole` compara contra `undefined` → 403 permanente |
