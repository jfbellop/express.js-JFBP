# Colección de pruebas — VendMax API (Semana 08)

Dos formatos con el mismo contenido: la matriz completa de RBAC y las cuatro capas de seguridad.

| Archivo | Herramienta | Requests |
|---|---|---|
| `vendmax-semana08.http` | **REST Client** (extensión de VS Code, `humao.rest-client`) | 33 bloques |
| `vendmax-semana08.postman_collection.json` | Postman / Insomnia | 40 requests con aserciones |

> **Nota sobre Thunder Client:** desde 2023 las *Collections* son función de pago, por eso la vía
> recomendada aquí es **REST Client**, que es gratuito y muestra la respuesta completa (status,
> headers y body) en un panel lateral — justo lo que hace falta para las evidencias.

---

## Antes de empezar

```bash
cd ../3-proyecto/starter
pnpm install
pnpm mongo   # terminal 1 — MongoDB en localhost:27017
pnpm seed    # terminal 2 — 3 usuarios + 6 máquinas
pnpm dev     # terminal 2 — http://localhost:3000
```

Usuarios sembrados:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@vendmax.co` | `Admin1234!` | `admin` |
| `operador@vendmax.co` | `Operador1234!` | `user` (dueño de VM-001…VM-004) |
| `tecnico@vendmax.co` | `Tecnico1234!` | `user` (dueño de VM-005 y VM-006) |

---

## Opción A — REST Client (recomendada)

1. Instalar la extensión **REST Client** de VS Code (`humao.rest-client`).
2. Abrir `vendmax-semana08.http`.
3. Pulsar el enlace gris **Send Request** que aparece sobre cada bloque.

**Ejecutar en orden.** Los bloques con `# @name` guardan su respuesta y los siguientes reutilizan
los tokens automáticamente:

```http
Authorization: Bearer {{loginAdmin.response.body.accessToken}}
```

No hay que copiar ni pegar ningún JWT. El bloque `10` es el que captura los ids de las máquinas,
así que conviene lanzarlo antes que el resto.

## Opción B — Postman

1. *Import* → *Files* → `vendmax-semana08.postman_collection.json`.
2. Comprobar la variable `baseUrl` (`http://localhost:3000/api/v1`).
3. Ejecutar la colección entera con el **Collection Runner**, o carpeta por carpeta en orden.

Cada request trae aserciones (`pm.test`), así que el Runner muestra el ✅/❌ al lado de cada una:
la propia pantalla de resultados sirve como evidencia. Los tokens se guardan solos en variables de
colección desde los tests de la carpeta *3. Login de los tres actores*.

---

## Qué demuestra cada carpeta

| Carpeta / bloques | Qué se comprueba |
|---|---|
| `0` Capas de seguridad | Cabeceras de Helmet, `RateLimit-*`, CORS permitido vs bloqueado, inyección `$gt` |
| `1` Lectura pública | El catálogo responde sin token y **oculta** `cashBalanceCents` y `createdBy` |
| `2` Escritura sin sesión | `POST`/`PATCH`/`DELETE`/reportes → **401** |
| `3` Login | Los tres actores y el claim `role` firmado dentro del JWT |
| `4` Visibilidad por rol | El mismo endpoint devuelve más o menos campos según quién pregunte |
| `5` Crear máquina | 201, 409 duplicado, 400 validación, 400 anti-XSS, 422 regla de dominio, mass assignment descartado |
| `6` PATCH | Dueño → 200 · otro usuario → **403** · admin → 200 |
| `7` Solo admin | Reporte y retiro de recaudo: rol `user` → **403**, `admin` → 200 |
| `8` DELETE | Ni siquiera el dueño puede borrar: solo `admin` |
| `9` Errores y rate limit | 404 sin stack trace, token manipulado → 401, **429** al sexto login |

---

## Capturas que pide la rúbrica

Los bloques marcados con 📸 en el `.http` son los que conviene guardar en
`../evidencias/screenshots/`:

| Evidencia | Bloque `.http` | Postman |
|---|---|---|
| Cabeceras de Helmet | `00` (pestaña Headers) | `00` |
| CORS: origen permitido vs `evil.com` → 403 | `01` y `02` | `01` y `02` |
| Rate limit: `X-RateLimit-Remaining` | `00` (Headers) | `00` |
| Rate limit de auth → 429 | `92` (repetir 6 veces) | `92` |
| NoSQL injection `$gt` → 400 | `04` | `03` |
| Catálogo público sin campos sensibles | `10` | `10` |
| `role` dentro del JWT | `32` (pegar el token en jwt.io) | `32` |
| Usuario no dueño → 403 | `61` | `61` |
| Rol `user` en ruta de admin → 403 | `70` | `70` |
| `DELETE` solo admin | `80` y `81` | `80` y `81` |

---

## Advertencia sobre el rate limit

El bloque `92` agota a propósito el limitador de `/auth` (5 intentos cada 15 minutos por IP).
Después de ejecutarlo, **ningún login funcionará** hasta que se reinicie `pnpm dev` — el contador
vive en memoria y se reinicia con el proceso. Es el comportamiento correcto y esperado.
