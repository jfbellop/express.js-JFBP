# Solución — Ejercicio 02: Refresh Tokens con Rotación

## ✅ Pasos completados

| Paso | Archivo | Qué se implementó |
|---|---|---|
| 1 | `src/models/user.model.ts` | Campo `refreshToken` (`select: false`) que guarda el **hash**, nunca el token |
| 2 | `src/utils/jwt.ts` | `signRefreshToken` / `verifyRefreshToken` con `JWT_REFRESH_SECRET` (≠ access) y `expiresIn: '7d'` |
| 3a | `src/services/auth.service.ts` | El login genera el refresh token, guarda su hash y devuelve ambos tokens |
| 3b | `src/services/auth.service.ts` | `refresh()`: verifica JWT → compara con el hash en DB → **rota** ambos tokens |
| 3c | `src/services/auth.service.ts` | `logout()`: borra el hash en DB (revocación del lado servidor) |
| 4 | `src/controllers/auth.controller.ts` | Handlers `refresh` y `logout` con `setTokenCookies` / `clearTokenCookies` |
| 5 | `src/routes/auth.routes.ts` | `POST /refresh` (sin auth, su credencial es la cookie) y `POST /logout` (con `authMiddleware`) |

## 🐛 Dos bugs reales encontrados al probar la rotación

### 1. Los tokens rotados salían idénticos

Dos JWT firmados **en el mismo segundo** con el mismo payload producen exactamente
la misma cadena, porque `iat` se mide en segundos. Resultado: `/auth/refresh`
"rotaba" a un token idéntico al anterior.

**Solución:** agregar un `jti` (JWT ID) aleatorio en cada firma.

```ts
export function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}
```

### 2. bcrypt aceptaba el refresh token **ya rotado**

Aun con tokens distintos, reutilizar el refresh viejo seguía devolviendo `200`.
Causa: **bcrypt solo procesa los primeros 72 bytes** de la entrada. Un JWT mide
250–400 caracteres y dos tokens del mismo usuario comparten los primeros ~90
(header idéntico + comienzo del payload con el mismo `sub`), así que
`bcrypt.compare(tokenViejo, hashDelTokenNuevo)` daba `true`: la rotación no
protegía absolutamente de nada.

**Solución** (`src/utils/tokenHash.ts`): comprimir el token a un digest SHA-256
de 44 caracteres —que sí cabe completo en los 72 bytes— y guardar el hash bcrypt
de ese digest.

```ts
const digest = (token: string) => createHash('sha256').update(token).digest('base64');
export const hashRefreshToken = (t: string) => bcrypt.hash(digest(t), SALT_ROUNDS);
export const compareRefreshToken = (t: string, h: string) => bcrypt.compare(digest(t), h);
```

Se sigue usando bcrypt para el almacenamiento (como pide la guía) y ahora la
rotación sí invalida el token anterior.

## ⚙️ Otros ajustes

- Se agregó `dotenv` a `package.json` (lo importa `server.ts` y no estaba declarado).
- `user.toObject() as Record<string, unknown>` no compila con el modelo tipado;
  se reemplazó por destructuring que descarta `password` y `refreshToken`.

## 🧪 Resultado de la prueba automática (`pnpm test:flow`)

```
1. Registro y login
  ✅ POST /auth/register → 201
  ✅ La respuesta no expone password ni refreshToken
  ✅ POST /auth/login → 200
  ✅ Set-Cookie accessToken + refreshToken
  ✅ accessToken es HttpOnly
  ✅ refreshToken es HttpOnly
  ✅ refreshToken limitado a Path=/api/v1/auth
  ✅ Max-Age del access ≈ 15 min y del refresh ≈ 7 días — Max-Age=900 / Max-Age=604800

2. Rotación de refresh token
  ✅ POST /auth/refresh → 200
  ✅ Se emitió un refresh token NUEVO
  ✅ Se emitió un access token NUEVO
  ✅ Los dos tokens usan secretos distintos (firmas distintas)
  ✅ El nuevo access token funciona en /auth/me → 200
  ✅ Reutilizar el refresh token viejo → 401
  ✅ Refresh sin cookie → 401

3. Logout
  ✅ POST /auth/logout → 200
  ✅ La respuesta limpia ambas cookies
  ✅ El cookie jar quedó vacío
  ✅ Refresh después del logout → 401 (hash borrado en DB)
  ✅ GET /auth/me sin cookies → 401

RESULTADO: 20 OK, 0 fallidas
```

## 📋 Cobertura de la rúbrica (20 pts)

| Criterio | Pts | Dónde |
|---|---|---|
| Campo `refreshToken` en el schema | 3 | `models/user.model.ts` |
| Refresh firmado con secreto distinto | 3 | `utils/jwt.ts` (`JWT_REFRESH_SECRET`) |
| Hash del refresh almacenado en el usuario | 3 | `utils/tokenHash.ts` + `auth.service.ts` |
| `POST /auth/refresh` verifica y rota | 4 | `auth.service.ts` → `refresh()` |
| `POST /auth/logout` limpia cookies y anula el token en DB | 4 | `auth.service.ts` → `logout()` + `clearTokenCookies` |
| Expiración de cookies coherente con los tokens | 3 | `Max-Age=900` (15 min) y `Max-Age=604800` (7 días) |
