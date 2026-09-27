# Screenshots

Capturas de la rúbrica de la semana 08. La forma más rápida de obtenerlas es con
`../../coleccion-api/vendmax-semana08.http` (extensión REST Client de VS Code):
cada bloque marcado con 📸 corresponde a una captura.

| Archivo sugerido | Bloque | Qué debe verse |
|---|---|---|
| `01-helmet-cabeceras.png` | `00` | Pestaña Headers: `nosniff`, `SAMEORIGIN`, HSTS, CSP y **sin** `x-powered-by` |
| `02-ratelimit-headers.png` | `00` | `RateLimit-Limit: 100` y `X-RateLimit-Remaining` |
| `03-cors-permitido.png` | `01` | 200 + `access-control-allow-origin: http://localhost:5173` |
| `04-cors-bloqueado.png` | `02` | 403 `{"error":"CORS: origin not allowed"}` sin cabecera CORS |
| `05-nosql-injection.png` | `04` | `{"$gt":""}` → 400, sin token |
| `06-catalogo-publico.png` | `10` | 200 sin `cashBalanceCents` ni `createdBy` |
| `07-jwt-con-role.png` | `32` | Token pegado en jwt.io mostrando `"role": "admin"` |
| `08-patch-no-dueno-403.png` | `61` | 403 al editar la máquina de otro operador |
| `09-admin-only-403.png` | `70` | Rol `user` en `/machines/reportes/recaudo` → 403 |
| `10-delete-solo-admin.png` | `80` y `81` | 403 para el dueño, 200 para el admin |
| `11-ratelimit-429.png` | `92` | Sexto intento de login → 429 |
