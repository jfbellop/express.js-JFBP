# Colección de pruebas — VendMax API (Semana 07)

20 requests cubriendo el flujo completo y los casos de error que pide la rúbrica.

| Archivo | Herramienta |
|---|---|
| `thunder-collection_vendmax-semana07.json` | Thunder Client (VS Code) |
| `vendmax-semana07.postman_collection.json` | Postman / Insomnia / Thunder Client |

## Importar

**Thunder Client:** pestaña *Collections* → menú `⋯` → **Import** → elegir el
archivo `thunder-collection_*.json`.

**Postman:** *Import* → *Files* → `vendmax-semana07.postman_collection.json`.
Trae las variables `baseUrl` (`http://localhost:3000/api/v1`) y `machineId`.

## Cómo usarla

1. Levantar la API: `pnpm dev` en `3-proyecto/starter` (y `pnpm seed` si quieres datos).
2. Ejecutar `01 · Register` y luego `04 · Login`.
   **Las cookies se guardan solas** en el cookie jar del cliente HTTP: las
   siguientes peticiones ya van autenticadas (eso es justamente lo que demuestra
   que el token viaja en cookie HttpOnly y no en un header manual).
3. Ejecutar `12 · Crear máquina`, copiar el `_id` de la respuesta y pegarlo:
   - Postman → variable `machineId`
   - Thunder Client → reemplazar `PEGA_AQUI_EL_ID` en la URL
4. Correr el resto de la carpeta `2. Máquinas`.

Cada request trae una aserción del código HTTP esperado, así que en Thunder
Client/Postman se ve el ✅/❌ al lado de la respuesta — sirve como screenshot.

## Para capturar los screenshots de la rúbrica

| Screenshot | Request |
|---|---|
| Register exitoso | `01 · Register` → 201 |
| Login con cookies HttpOnly | `04 · Login` → pestaña **Headers** → `Set-Cookie` |
| Acceso sin token → 401 | `09 · Me tras logout` o borrar cookies y llamar `10 · Listar máquinas` |
| CRUD completo | requests `10`, `12`, `15`, `17`, `19` |
| Refresh exitoso | `07 · Refresh` → 200 + nuevas cookies |
| Logout y refresh posterior → 401 | `08 · Logout`, luego `07 · Refresh` |
