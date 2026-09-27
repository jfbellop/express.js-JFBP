# Ejercicio 02 — Helmet, CORS, rate limiting y sanitización

**Semana 08 · Autorización y Seguridad** · Carpeta del código: [`starter/`](./starter)

Resultado de la verificación automática: **31 / 31 pruebas OK**
(salida completa en [`../../evidencias/ejercicio-02-seguridad-test-flow.txt`](../../evidencias/ejercicio-02-seguridad-test-flow.txt))

---

## 1. Las cuatro capas y su orden en `app.ts`

El orden de los middlewares **es** la configuración de seguridad. Este es el que se implementó:

```ts
app.use(helmet());          // 1. cabeceras seguras en TODAS las respuestas
app.use(globalLimiter);     // 2. cortar el abuso antes de gastar CPU
app.use(cors(corsOptions)); // 3. ¿puede este origen hablar con la API?
app.use(express.json());    // 4. parsear el cuerpo
app.use(cookieParser());
app.use(patchQuery);        // 5. (parche Express 5, ver §6)
app.use(mongoSanitize());   // 6. limpiar el input ya parseado
// ... rutas ...
app.use(notFound);          // 7. 404
app.use(errorHandler);      // 8. errores, siempre el último
```

Razonamiento de cada posición:

1. **Helmet primero.** Las cabeceras deben acompañar también a los 404, a los 429 y a los errores,
   no solo a las respuestas felices.
2. **Rate limit antes del body parser.** A una petición que se va a rechazar no le dedicamos el
   coste de parsear un JSON de 100 KB.
3. **CORS antes de las rutas.** Si el origen no está permitido, la petición muere ahí.
4. **Sanitización después de parsear.** Imposible limpiar `req.body` antes de que exista.
5. **`errorHandler` el último.** Express identifica el manejador de errores por su aridad de
   cuatro argumentos, y solo lo alcanza lo que ya pasó por todo lo anterior.

---

## 2. Helmet — cabeceras que sí aparecieron en la respuesta

`app.use(helmet())` con la configuración por defecto. Medido con `curl -i`:

| Cabecera | Valor emitido | Qué ataque mitiga |
|----------|---------------|-------------------|
| `X-Content-Type-Options` | `nosniff` | MIME sniffing: el navegador deja de "adivinar" el tipo y ejecutar como script algo servido como texto |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking: nadie mete la app en un `<iframe>` ajeno |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Downgrade a HTTP y *SSL stripping* |
| `Content-Security-Policy` | `default-src 'self'; ...` | XSS: restringe de dónde se puede cargar y ejecutar código |
| `X-DNS-Prefetch-Control` | `off` | Fugas de información por resolución DNS anticipada |
| `Referrer-Policy` | `no-referrer` | Evita filtrar URLs internas al navegar hacia fuera |
| `X-Powered-By` | **eliminada** | Ya no se anuncia "Express" a quien escanea la API |

Detalle que suele pasar desapercibido: `helmet()` no solo **añade** cabeceras, también **quita**
`X-Powered-By`. Es *security through obscurity*, sí, pero no regala al atacante el primer dato
que usaría para buscar CVEs del framework.

---

## 3. Rate limiting — dos limitadores con propósitos distintos

```ts
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,                      // 100 peticiones / 15 min / IP
  standardHeaders: 'draft-6',
  legacyHeaders: true,
  message: { error: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                        // 5 intentos / 15 min / IP
  standardHeaders: 'draft-6',
  legacyHeaders: true,
  skipSuccessfulRequests: false,
  message: { error: 'Too many login attempts, please try again later' },
});
```

Aplicado solo donde importa:

```ts
router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
```

**Por qué dos límites y no uno.** El global (100/15 min) frena scraping y abuso general sin
estorbar a un usuario real. El de autenticación (5/15 min) ataca un problema distinto: la fuerza
bruta. Con 100 intentos cada 15 minutos, un atacante prueba ~9.600 contraseñas al día; con 5, baja
a 480. Y un usuario legítimo jamás necesita más de 5 intentos de login en un cuarto de hora.

> **Desviación documentada sobre las cabeceras.** El enunciado verifica `RateLimit-Limit: 100`
> (formato *draft-6*) y la rúbrica exige ver `X-RateLimit-Remaining` (formato *legacy*). Son dos
> familias de cabeceras distintas y `draft-7` las fusionaría en una sola `RateLimit`. Por eso se
> combinó `standardHeaders: 'draft-6'` **con** `legacyHeaders: true`: la respuesta emite las dos
> familias y cumple ambos criterios a la vez.

Respuesta real al sexto intento de login:

```
HTTP/1.1 429 Too Many Requests
{"error":"Too many login attempts, please try again later"}
```

Con `skipSuccessfulRequests: false` incluso un login **correcto** consume cupo; es lo más estricto
y es lo que verifica el enunciado. Mientras `/auth/login` está bloqueado, `/health` y el resto de
la API siguen respondiendo 200: el bloqueo es quirúrgico, no una caída del servicio.

---

## 4. CORS con whitelist

```ts
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ??
  'http://localhost:5173,http://localhost:3001').split(',').map((o) => o.trim());

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

**Por qué `origin: '*'` es inaceptable aquí.** Esta API usa cookies `httpOnly` para el refresh
token. El comodín y `credentials: true` son incompatibles por especificación, y si se forzara el
eco del origen, cualquier web podría hacer peticiones autenticadas con la sesión de la víctima
(CSRF con lectura de respuesta). La whitelist responde `Access-Control-Allow-Origin` únicamente a
los orígenes declarados.

**Por qué se deja pasar la petición sin cabecera `Origin`.** curl, Postman, REST Client o un
servicio backend no envían `Origin`. CORS es una política **del navegador** para proteger al
usuario de otras webs; no es un cortafuegos. Bloquear ahí no aporta seguridad y rompería toda la
integración server-to-server.

Comportamiento medido:

| Petición | Resultado |
|----------|-----------|
| `Origin: http://localhost:5173` | 200 + `access-control-allow-origin: http://localhost:5173` + `allow-credentials: true` |
| `Origin: http://evil.com` | **403** `{"error":"CORS: origin not allowed"}`, **sin** cabecera `access-control-allow-origin` |
| `OPTIONS` preflight desde origen permitido | 204 con `access-control-allow-methods: GET,POST,PATCH,DELETE` |

---

## 5. Sanitización NoSQL

```ts
app.use(mongoSanitize()); // elimina claves que empiecen por $ o contengan .
```

El ataque clásico contra un login mal validado:

```json
{ "email": { "$gt": "" }, "password": { "$gt": "" } }
```

`{ $gt: "" }` significa "cualquier valor mayor que la cadena vacía", es decir, **cualquier
usuario**. Sin sanitización, `User.findOne({ email: { $gt: '' } })` devuelve el primer usuario de
la colección y el atacante entra sin conocer ninguna credencial.

Resultado real de esa petición contra esta API:

```
HTTP/1.1 400 Bad Request
{"error":"Validation failed","details":{"email":"Invalid email"}}
```

Dos capas actuaron en cadena: `express-mongo-sanitize` borró las claves `$gt` (dejando objetos
vacíos) y Zod rechazó el resultado por no ser un email. **Nunca** se devuelve un token. La
defensa en profundidad funciona precisamente así: aunque una capa falle, la siguiente sostiene.

---

## 6. Dos bugs del starter que hubo que corregir

Ninguno de los dos es opcional: sin arreglarlos el servidor **no arranca** o **revienta en la
primera petición**.

| Bug | Síntoma | Corrección aplicada |
|-----|---------|---------------------|
| `app.options('*', cors(corsOptions))` | `TypeError: Missing parameter name at 1` al arrancar. Express 5 usa `path-to-regexp` v8, donde `'*'` ya no es un comodín válido | Se elimina la línea: `cors()` ya responde a los preflight `OPTIONS` por sí solo |
| `express-mongo-sanitize@2.2.0` | `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter` en cada petición. La librería reasigna `req.query`, que en Express 5 es solo lectura | Se redefine `req.query` como propiedad escribible en un middleware previo, justo antes de `mongoSanitize()` |

```ts
// el parche, justo antes de app.use(mongoSanitize())
app.use((req, _res, next) => {
  Object.defineProperty(req, 'query', {
    value: req.query, writable: true, configurable: true, enumerable: true,
  });
  next();
});
```

Un tercer detalle del starter: `@types/express-mongo-sanitize@2.1.4` **no existe** en el registro
de npm (la última publicada es la 2.1.2), así que `pnpm install` falla de entrada. Como la propia
librería ya incluye sus tipos, la dependencia se eliminó del `package.json` en lugar de fijar otra
versión.

---

## 7. Manejador de errores sin filtraciones

```ts
if (err instanceof AppError)  → err.statusCode + err.message
if (err instanceof ZodError)  → 400 + detalle por campo
if (err.message.startsWith('CORS blocked')) → 403 { error: 'CORS: origin not allowed' }
resto → console.error(err) en el servidor + 500 { error: 'Internal server error' }
```

La rama de CORS no es un adorno: sin ella, el `Error` que lanza el callback de `cors` cae en el
`else` genérico y el origen bloqueado recibiría un **500** (parece un fallo del servidor) en lugar
de un **403** (política aplicada a propósito).

Y bajo ninguna circunstancia sale al cliente `err.stack`: un stack trace revela rutas absolutas
del servidor, nombres de dependencias y versiones. El log completo se queda en el servidor.

---

## 8. Cómo reproducirlo

```bash
cd starter
pnpm install
pnpm mongo      # terminal 1
pnpm seed       # terminal 2
pnpm dev        # terminal 2
pnpm test:flow  # terminal 3 — 31 comprobaciones
```

> ⚠️ `test:flow` agota a propósito el limitador de `/auth` (5 intentos). Para repetir la prueba
> hay que **reiniciar `pnpm dev`**: el contador vive en memoria y se reinicia con el proceso.
