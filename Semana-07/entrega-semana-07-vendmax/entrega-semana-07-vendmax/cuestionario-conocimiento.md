# Cuestionario de Conocimiento — Semana 07: Autenticación con JWT

> Evidencia de **Conocimiento (30%)** de la rúbrica.
> Dominio del proyecto: **VendMax — red de máquinas expendedoras**.

---

### 1. ¿Por qué NO se deben almacenar contraseñas en texto plano y por qué MD5/SHA-256 no son seguros para este caso?

Si la base de datos se filtra (backup expuesto, inyección, empleado malicioso), en texto plano el atacante obtiene **todas** las cuentas de inmediato y, como la gente reutiliza contraseñas, también sus cuentas de correo y banco. Guardar el hash hace que una filtración no entregue las credenciales directamente.

MD5 y SHA-256 sí son hashes, pero están **diseñados para ser rápidos** (validar integridad de archivos). Esa velocidad juega en contra: una GPU actual calcula miles de millones de SHA-256 por segundo, así que un diccionario de contraseñas comunes se prueba en minutos. Además, sin salt, contraseñas iguales producen hashes iguales y se pueden usar *rainbow tables* precalculadas.

bcrypt (o argon2/scrypt) es lo correcto porque: (a) es **deliberadamente lento** y su coste es configurable con los *salt rounds*, de modo que se puede encarecer con el hardware del futuro; (b) **incorpora salt automáticamente**.

---

### 2. ¿Qué es el "salt" en bcrypt y cómo previene los ataques de rainbow table?

El salt es un valor **aleatorio y único por contraseña** que bcrypt genera y mezcla con la contraseña antes de hashear. Queda guardado dentro del propio hash resultante:

```
$2b$10$N9qo8uLOickgx2ZMRZoMye     IjZAgcfl7p92ldGxad68LJZdL17lhWy
│   │  └── salt (22 chars)         └── hash (31 chars)
│   └───── coste (2^10 iteraciones)
└───────── versión del algoritmo
```

Una *rainbow table* es un diccionario precalculado `hash → contraseña`. Con salt esa tabla deja de servir: el atacante tendría que generar una tabla nueva **para cada salt**, es decir para cada usuario. Además, dos usuarios con la contraseña `Vendmax2026!` tendrán hashes distintos, así que romper uno no revela el otro y tampoco se puede deducir quién comparte contraseña.

---

### 3. Explica las tres partes de un JWT. ¿Por qué el payload es legible pero no modificable?

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiI2OGQ2Li4uIiwicm9sZSI6InVzZXIifQ . 4pcPyMD09olPSyXnrXCjTA
            HEADER                                   PAYLOAD                              SIGNATURE
```

- **Header**: metadatos del token — algoritmo (`alg: HS256`) y tipo (`typ: JWT`).
- **Payload**: los *claims*. Estándar: `sub` (id del usuario), `iat` (emitido en), `exp` (expira en), `jti` (id único del token). Propios: `email`, `role`.
- **Signature**: `HMAC-SHA256(base64url(header) + "." + base64url(payload), SECRETO)`.

El payload es legible porque **base64url es codificación, no cifrado** (cualquiera puede pegarlo en jwt.io). Por eso jamás se ponen datos sensibles ahí.

No es modificable porque si un atacante cambia `"role":"user"` por `"role":"admin"` tendría que recalcular la firma, y para eso necesita el secreto del servidor. Al verificar, el servidor recalcula el HMAC sobre header+payload y lo compara: si no coincide, `jwt.verify()` lanza `JsonWebTokenError` y la petición se rechaza con 401.

---

### 4. ¿Cuál es la diferencia entre un access token y un refresh token? ¿Por qué tienen duraciones distintas?

| | Access token | Refresh token |
|---|---|---|
| Para qué sirve | Autenticar **cada** petición a la API | Obtener un access token nuevo |
| Dónde viaja | Cookie `accessToken`, `Path=/` | Cookie `refreshToken`, `Path=/api/v1/auth` |
| Duración | 15 minutos | 7 días |
| Contenido | `sub`, `email`, `role`, `jti` | `sub`, `jti` (mínimo necesario) |
| Secreto | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| ¿Revocable? | No (es *stateless*) | Sí: su hash está en la base de datos |

Las duraciones son distintas por un equilibrio entre seguridad y usabilidad. El access token se expone en todas las peticiones, así que si lo roban debe morir pronto: 15 minutos. Pero pedirle al usuario que inicie sesión cada 15 minutos es inaceptable, así que el refresh token —que casi no circula y **sí se puede revocar**— mantiene la sesión viva durante 7 días.

---

### 5. ¿Por qué almacenar el JWT en una cookie HttpOnly es más seguro que en `localStorage`?

`localStorage` es accesible desde JavaScript: basta **un XSS** (o una dependencia npm comprometida) para que `localStorage.getItem('token')` se envíe al servidor del atacante y este suplante al usuario.

Una cookie marcada `HttpOnly` **no existe para JavaScript**: `document.cookie` no la ve. Aunque se inyecte un script, no puede leer ni copiar el token. Además la cookie permite endurecer más:

- `Secure` → solo viaja por HTTPS (evita robo en redes públicas).
- `SameSite=Lax` → no se envía en peticiones cross-site → mitiga CSRF.
- `Path=/api/v1/auth` → el refresh token ni siquiera se manda al resto de la API.
- `Max-Age` → el navegador la borra cuando el token expira.

La contrapartida es que las cookies se envían solas, así que hay que cuidar CSRF (con `SameSite` y, en formularios sensibles, token anti-CSRF).

---

### 6. ¿Qué es la "rotación de refresh tokens"? ¿Qué problema de seguridad resuelve?

Rotar significa que **cada llamada a `/auth/refresh` emite un refresh token nuevo e invalida el anterior**: se firma un token nuevo, se guarda su hash en `user.refreshToken` y el hash viejo desaparece.

Resuelve el problema de un refresh token robado con vida de 7 días. Con rotación:

- Si el atacante lo usa, el token del usuario legítimo deja de funcionar: su siguiente refresh da 401 y debe volver a iniciar sesión → la intrusión se **detecta**.
- Si el usuario legítimo lo usa primero, el del atacante queda inservible.
- La ventana de utilidad de un token robado baja de "7 días" a "hasta el próximo refresh".

**Detalle que descubrí implementándolo:** guardar `bcrypt.hash(refreshToken)` del JWT completo **rompe** la rotación, porque bcrypt solo procesa los primeros 72 bytes y dos JWT del mismo usuario comparten ese prefijo (header + inicio del payload). `bcrypt.compare()` daba `true` con el token viejo. La solución fue hashear un digest SHA-256 del token: `bcrypt(SHA256(token))`.

---

### 7. En el middleware de autenticación, ¿qué respuesta debe retornar si el token es válido pero ya expiró?

**401 Unauthorized**, no 403. `jwt.verify()` lanza `TokenExpiredError`, que se captura para responder `401 { "error": "Token expirado" }`.

401 significa "no estás autenticado (o tu credencial ya no sirve): renuévala". Es la señal para que el cliente llame a `/auth/refresh` y reintente. 403 Forbidden significa otra cosa: "sé quién eres, pero no tienes permiso para esto" (eso es autorización, semana 08). Confundirlos rompe la lógica del cliente: ante un 403 no tendría sentido intentar refrescar el token.

---

### 8. ¿Por qué el login debe devolver el mismo mensaje de error para "email no encontrado" y "contraseña incorrecta"?

Para evitar **user enumeration**. Si "email no registrado" y "contraseña incorrecta" fueran mensajes distintos, un atacante podría probar listas de correos y aprender **cuáles existen** en VendMax. Con esa lista hace phishing dirigido, *credential stuffing* con contraseñas filtradas de otros sitios o fuerza bruta solo contra cuentas reales.

Por eso ambos casos responden exactamente `401 { "error": "Credenciales inválidas" }`. Lo mismo aplica a "olvidé mi contraseña" ("si el correo existe, te enviamos un enlace") y al registro. Idealmente se cuida también el **tiempo de respuesta** (que no sea notablemente más rápido cuando el usuario no existe) y se combina con rate limiting (semana 08).

---

### 9. ¿Qué hace `{ select: false }` en un campo de Mongoose y para qué se usa en `password`?

Hace que el campo **no se incluya en los resultados de las consultas por defecto**. `User.findById(id)` devuelve el documento sin `password`; para obtenerlo hay que pedirlo explícitamente:

```ts
User.findOne({ email }).select('+password');
```

Se usa en `password` (y en `refreshToken`) como **defensa en profundidad**: si en algún controlador se hace `res.json(user)` por descuido, el hash no se filtra porque nunca estuvo cargado. En este proyecto la única consulta que lo pide es la del login, que es justo donde se necesita para `bcrypt.compare`.

---

### 10. ¿Cuántos secretos JWT distintos se usan en el patrón access/refresh y por qué son dos, no uno?

Dos: `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`, ambos en `.env` y generados con `openssl rand -base64 64`.

Son dos por **separación de dominios criptográficos**. El secreto de acceso se usa en cada verificación y está más expuesto; si se filtrara y fuera el mismo, el atacante podría fabricar **refresh tokens** válidos por 7 días y renovar sesión indefinidamente. Con secretos separados, el daño queda acotado a tokens de 15 minutos.

Además permite **rotar un secreto sin tumbar el otro** y garantiza que un token no pueda usarse en el flujo equivocado: un access token presentado en `/auth/refresh` falla la verificación porque fue firmado con otro secreto.
