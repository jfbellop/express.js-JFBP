import 'dotenv/config';

// ============================================================================
<<<<<<< HEAD
// PRUEBA AUTOMÁTICA — VendMax API, semana 08
// ============================================================================
// Verifica de punta a punta: capas de seguridad HTTP (Helmet, rate limit,
// CORS, sanitización) + la matriz completa de RBAC sobre el recurso máquinas.
//
// Uso:
//   1. pnpm mongo     (terminal 1)
//   2. pnpm seed      (una vez)
//   3. pnpm dev       (terminal 2)
//   4. pnpm test:flow (terminal 3)
//
// ⚠️ La última sección agota a propósito el rate limit de /auth (5 intentos /
// 15 min). Para repetir la prueba hay que reiniciar `pnpm dev`.
=======
// PRUEBA END-TO-END DEL FLUJO COMPLETO — VendMax API (Semana 07)
// ============================================================================
// Recorre los mismos casos que pide la rúbrica (auth + CRUD + 401/404/409 +
// rotación de refresh + logout) y los verifica automáticamente.
//
// Uso:
//   1. Terminal A: pnpm dev
//   2. Terminal B: pnpm test:flow
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
// ============================================================================

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api/v1`;

<<<<<<< HEAD
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, extra = ''): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`);
=======
// ─── Mini "cookie jar": guarda las cookies como lo haría el navegador ────────
const jar = new Map<string, string>();

function cookieHeader(): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function absorbCookies(setCookies: string[]): void {
  for (const raw of setCookies) {
    const pair = raw.split(';')[0] ?? '';
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    if (!value) jar.delete(name); // clearCookie envía value vacío
    else jar.set(name, value);
  }
}

interface CallResult {
  status: number;
  body: any;
  setCookies: string[];
}

async function call(
  method: string,
  path: string,
  opts: { body?: unknown; withCookies?: boolean } = {},
): Promise<CallResult> {
  const { body, withCookies = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withCookies && jar.size > 0) headers['Cookie'] = cookieHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookies = res.headers.getSetCookie();
  if (withCookies) absorbCookies(setCookies);

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, setCookies };
}

// ─── Reporte ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

<<<<<<< HEAD
interface CallOptions {
  method?: string;
  body?: unknown;
  token?: string;
  origin?: string;
}

interface CallResult {
  status: number;
  headers: Headers;
  body: Record<string, unknown>;
}

async function call(path: string, options: CallOptions = {}): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.origin) headers.Origin = options.origin;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let body: Record<string, unknown> = {};
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = { raw: text };
    }
  }
  return { status: res.status, headers: res.headers, body };
}

async function login(email: string, password: string): Promise<string> {
  const res = await call('/auth/login', { method: 'POST', body: { email, password } });
  return res.body.accessToken as string;
}

async function main(): Promise<void> {
  console.log('═'.repeat(76));
  console.log(`  VendMax API — semana 08: RBAC + seguridad  (${BASE_URL})`);
  console.log('═'.repeat(76));

  // ================================================================ 0
  section('0. Capas de seguridad HTTP');
  const health = await call('/health');
  check('GET /health → 200', health.status === 200, `status=${health.status}`);

  const h = health.headers;
  check('Helmet: X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff');
  check('Helmet: X-Frame-Options presente', h.get('x-frame-options') !== null, String(h.get('x-frame-options')));
  check(
    'Helmet: Strict-Transport-Security presente',
    (h.get('strict-transport-security') ?? '').includes('max-age'),
  );
  check('Helmet: Content-Security-Policy presente', h.get('content-security-policy') !== null);
  check('Helmet: X-Powered-By eliminado', h.get('x-powered-by') === null);
  check('Rate limit: RateLimit-Limit = 100', h.get('ratelimit-limit') === '100', String(h.get('ratelimit-limit')));
  check(
    'Rate limit: X-RateLimit-Remaining presente',
    h.get('x-ratelimit-remaining') !== null,
    String(h.get('x-ratelimit-remaining')),
  );

  const corsOk = await call('/health', { origin: 'http://localhost:5173' });
  check(
    'CORS: origen de la whitelist recibe Allow-Origin',
    corsOk.headers.get('access-control-allow-origin') === 'http://localhost:5173',
  );
  const corsBad = await call('/health', { origin: 'http://evil.com' });
  check('CORS: origen desconocido → 403', corsBad.status === 403, `status=${corsBad.status}`);
  check(
    'CORS: al origen bloqueado no se le devuelve Allow-Origin',
    corsBad.headers.get('access-control-allow-origin') === null,
  );

  const injection = await call('/auth/login', {
    method: 'POST',
    body: { email: { $gt: '' }, password: { $gt: '' } },
  });
  check(
    'NoSQL injection ($gt) no autentica',
    injection.status !== 200 && injection.body.accessToken === undefined,
    `status=${injection.status}`,
  );

  // ================================================================ 1
  section('1. Lectura pública del catálogo (sin token)');
  const publicList = await call('/machines');
  check('GET /machines sin token → 200', publicList.status === 200, `status=${publicList.status}`);
  check('Indica acceso público', publicList.body.access === 'público', String(publicList.body.access));

  const publicItems = (publicList.body.data ?? []) as Array<Record<string, unknown>>;
  check('Devuelve el catálogo sembrado', publicItems.length >= 5, `total=${publicItems.length}`);
  check(
    'El visitante anónimo NO ve el recaudo (cashBalanceCents)',
    publicItems.every((m) => m.cashBalanceCents === undefined),
  );
  check(
    'El visitante anónimo NO ve quién es el dueño (createdBy)',
    publicItems.every((m) => m.createdBy === undefined),
  );
  check(
    'Sí ve lo útil para el cliente (code, location, status)',
    publicItems.every((m) => typeof m.code === 'string' && typeof m.location === 'string'),
  );

  const someId = String(publicItems[0]?.id ?? '');
  const publicDetail = await call(`/machines/${someId}`);
  check('GET /machines/:id sin token → 200', publicDetail.status === 200, `status=${publicDetail.status}`);

  // ================================================================ 2
  section('2. Escritura sin sesión: bloqueada');
  const createNoToken = await call('/machines', {
    method: 'POST',
    body: { code: 'VM-900', modelName: 'Pirata', type: 'snacks', location: 'Sitio X', slots: 10 },
  });
  check('POST /machines sin token → 401', createNoToken.status === 401, `status=${createNoToken.status}`);

  const patchNoToken = await call(`/machines/${someId}`, { method: 'PATCH', body: { location: 'Hackeada' } });
  check('PATCH /machines/:id sin token → 401', patchNoToken.status === 401, `status=${patchNoToken.status}`);

  const deleteNoToken = await call(`/machines/${someId}`, { method: 'DELETE' });
  check('DELETE /machines/:id sin token → 401', deleteNoToken.status === 401, `status=${deleteNoToken.status}`);

  const reportNoToken = await call('/machines/reportes/recaudo');
  check('GET /machines/reportes/recaudo sin token → 401', reportNoToken.status === 401, `status=${reportNoToken.status}`);

  // ================================================================ 3
  section('3. Login de los tres actores');
  const operadorToken = await login('operador@vendmax.co', 'Operador1234!');
  check('Login operador (role: user) → token', typeof operadorToken === 'string' && operadorToken.length > 20);

  const tecnicoToken = await login('tecnico@vendmax.co', 'Tecnico1234!');
  check('Login técnico (role: user) → token', typeof tecnicoToken === 'string' && tecnicoToken.length > 20);

  const adminToken = await login('admin@vendmax.co', 'Admin1234!');
  check('Login admin (role: admin) → token', typeof adminToken === 'string' && adminToken.length > 20);

  const payload = JSON.parse(
    Buffer.from((adminToken.split('.')[1] ?? ''), 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
  check('El JWT del admin lleva role=admin', payload.role === 'admin', `role=${String(payload.role)}`);

  // ================================================================ 4
  section('4. Visibilidad de campos según quién pregunta');
  const listAsTecnico = await call('/machines', { token: tecnicoToken });
  const itemsTecnico = (listAsTecnico.body.data ?? []) as Array<Record<string, unknown>>;
  const ajena = itemsTecnico.find((m) => m.code === 'VM-001'); // es del operador
  const propia = itemsTecnico.find((m) => m.code === 'VM-006'); // es del técnico
  check('Autenticado ve el dueño de cada máquina', ajena?.createdBy !== undefined);
  check('El técnico NO ve el recaudo de una máquina ajena', ajena?.cashBalanceCents === undefined);
  check('El técnico SÍ ve el recaudo de SU máquina', typeof propia?.cashBalanceCents === 'number');

  const listAsAdmin = await call('/machines', { token: adminToken });
  const itemsAdmin = (listAsAdmin.body.data ?? []) as Array<Record<string, unknown>>;
  check(
    'El admin ve el recaudo de todas',
    itemsAdmin.every((m) => typeof m.cashBalanceCents === 'number'),
  );

  // ================================================================ 5
  section('5. Crear máquina (autenticado, cualquier rol)');
  const nuevoCodigo = `VM-${String(Math.floor(Math.random() * 800) + 100).padStart(3, '0')}`;
  const created = await call('/machines', {
    token: tecnicoToken,
    method: 'POST',
    body: {
      code: nuevoCodigo,
      modelName: 'SnackMaster 3000',
      type: 'snacks',
      location: 'Sede Norte — Piso 1',
      slots: 36,
    },
  });
  check('POST /machines con token → 201', created.status === 201, `status=${created.status}`);
  const nueva = (created.body.data ?? {}) as Record<string, unknown>;
  const nuevaId = String(nueva.id ?? '');
  check('La máquina queda asociada a su creador', typeof nueva.createdBy === 'string');

  const dup = await call('/machines', {
    token: tecnicoToken,
    method: 'POST',
    body: { code: nuevoCodigo, modelName: 'Otra', type: 'snacks', location: 'Sede Sur', slots: 20 },
  });
  check('Código duplicado → 409', dup.status === 409, `status=${dup.status}`);

  const invalid = await call('/machines', {
    token: tecnicoToken,
    method: 'POST',
    body: { code: 'XX-1', modelName: 'A', type: 'nave', location: 'x', slots: 0 },
  });
  check('Payload inválido → 400 (Zod)', invalid.status === 400, `status=${invalid.status}`);

  const xss = await call('/machines', {
    token: tecnicoToken,
    method: 'POST',
    body: {
      code: 'VM-999',
      modelName: '<script>alert(1)</script>',
      type: 'snacks',
      location: 'Sede XSS',
      slots: 10,
    },
  });
  check('HTML en los campos de texto → 400 (anti-XSS almacenado)', xss.status === 400, `status=${xss.status}`);

  const snacksFrio = await call('/machines', {
    token: tecnicoToken,
    method: 'POST',
    body: {
      code: 'VM-998',
      modelName: 'CoolDrink 500',
      type: 'snacks',
      location: 'Sede Y',
      slots: 10,
      temperatureC: 4,
    },
  });
  check('Regla de dominio: snacks con temperatura → 422', snacksFrio.status === 422, `status=${snacksFrio.status}`);

  // ================================================================ 6
  section('6. PATCH — dueño sí, otro usuario no, admin siempre');
  const patchOwner = await call(`/machines/${nuevaId}`, {
    token: tecnicoToken,
    method: 'PATCH',
    body: { status: 'mantenimiento', notes: 'Compresor en revision' },
  });
  check('El DUEÑO puede editar su máquina → 200', patchOwner.status === 200, `status=${patchOwner.status}`);
  check(
    'El cambio se aplicó',
    ((patchOwner.body.data ?? {}) as Record<string, unknown>).status === 'mantenimiento',
  );

  const patchOtro = await call(`/machines/${nuevaId}`, {
    token: operadorToken,
    method: 'PATCH',
    body: { location: 'Me la apropio' },
  });
  check(
    'OTRO usuario autenticado NO puede editarla → 403',
    patchOtro.status === 403,
    `status=${patchOtro.status}`,
  );
  check(
    'El 403 explica el motivo sin filtrar datos internos',
    String(patchOtro.body.error ?? '').toLowerCase().includes('admin'),
    String(patchOtro.body.error ?? ''),
  );

  const patchAdmin = await call(`/machines/${nuevaId}`, {
    token: adminToken,
    method: 'PATCH',
    body: { notes: 'Revisada por administracion' },
  });
  check('El ADMIN puede editar cualquier máquina → 200', patchAdmin.status === 200, `status=${patchAdmin.status}`);

  const vm005 = itemsAdmin.find((m) => m.code === 'VM-005');
  const reactivar = await call(`/machines/${String(vm005?.id)}`, {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'operativa' },
  });
  check(
    'Regla de dominio: fuera_de_servicio → operativa bloqueado (409)',
    reactivar.status === 409,
    `status=${reactivar.status}`,
  );

  const patchVacio = await call(`/machines/${nuevaId}`, { token: adminToken, method: 'PATCH', body: {} });
  check('PATCH sin campos → 400', patchVacio.status === 400, `status=${patchVacio.status}`);

  // ================================================================ 7
  section('7. Rutas exclusivas de admin (requireRole)');
  const reportAsUser = await call('/machines/reportes/recaudo', { token: tecnicoToken });
  check('Reporte con rol user → 403', reportAsUser.status === 403, `status=${reportAsUser.status}`);

  const reportAsAdmin = await call('/machines/reportes/recaudo', { token: adminToken });
  check('Reporte con rol admin → 200', reportAsAdmin.status === 200, `status=${reportAsAdmin.status}`);
  const report = (reportAsAdmin.body.data ?? {}) as Record<string, unknown>;
  check('El reporte suma el recaudo total', typeof report.totalCashCents === 'number', `total=${String(report.totalCashCents)}`);

  const vm001 = itemsAdmin.find((m) => m.code === 'VM-001');
  const cashAsUser = await call(`/machines/${String(vm001?.id)}/recaudo`, {
    token: operadorToken,
    method: 'POST',
    body: {},
  });
  check(
    'Retirar recaudo con rol user → 403 (aunque sea SU máquina)',
    cashAsUser.status === 403,
    `status=${cashAsUser.status}`,
  );

  const cashAsAdmin = await call(`/machines/${String(vm001?.id)}/recaudo`, {
    token: adminToken,
    method: 'POST',
    body: { collectedBy: 'Auditoria interna' },
  });
  check('Retirar recaudo con rol admin → 200', cashAsAdmin.status === 200, `status=${cashAsAdmin.status}`);
  const cashData = (cashAsAdmin.body.data ?? {}) as Record<string, unknown>;
  check('Devuelve cuánto se retiró', typeof cashData.collectedCents === 'number', `centavos=${String(cashData.collectedCents)}`);

  const cashTwice = await call(`/machines/${String(vm001?.id)}/recaudo`, {
    token: adminToken,
    method: 'POST',
    body: {},
  });
  check('Retirar recaudo dos veces → 409 (ya está en cero)', cashTwice.status === 409, `status=${cashTwice.status}`);

  // ================================================================ 8
  section('8. DELETE — solo admin');
  const deleteAsUser = await call(`/machines/${nuevaId}`, { token: tecnicoToken, method: 'DELETE' });
  check(
    'El dueño NO puede eliminar su propia máquina → 403',
    deleteAsUser.status === 403,
    `status=${deleteAsUser.status}`,
  );

  const deleteAsAdmin = await call(`/machines/${nuevaId}`, { token: adminToken, method: 'DELETE' });
  check('El admin elimina → 200', deleteAsAdmin.status === 200, `status=${deleteAsAdmin.status}`);

  const gone = await call(`/machines/${nuevaId}`);
  check('La máquina ya no existe → 404', gone.status === 404, `status=${gone.status}`);

  const badId = await call('/machines/abc123');
  check('Id malformado → 400', badId.status === 400, `status=${badId.status}`);

  const conRecaudo = itemsAdmin.find((m) => m.code === 'VM-006');
  const deleteConPlata = await call(`/machines/${String(conRecaudo?.id)}`, {
    token: adminToken,
    method: 'DELETE',
  });
  check(
    'No se elimina una máquina con recaudo pendiente → 409',
    deleteConPlata.status === 409,
    `status=${deleteConPlata.status}`,
  );

  // ================================================================ 9
  section('9. Errores seguros y rate limit de autenticación');
  const notFound = await call('/ruta-inexistente');
  check('Ruta inexistente → 404', notFound.status === 404, `status=${notFound.status}`);
  check(
    'Ningún error expone stack trace ni rutas internas',
    !JSON.stringify(notFound.body).includes('at ') && !JSON.stringify(notFound.body).includes('node_modules'),
    JSON.stringify(notFound.body),
  );

  console.log('     (se agotan los intentos de login a propósito: debe salir 429)');
  let lastStatus = 0;
  for (let i = 0; i < 8; i++) {
    const attempt = await call('/auth/login', {
      method: 'POST',
      body: { email: 'admin@vendmax.co', password: 'ClaveIncorrecta1!' },
    });
    lastStatus = attempt.status;
  }
  check('Fuerza bruta en /auth/login → 429', lastStatus === 429, `status=${lastStatus}`);

  const catalogoSigue = await call('/machines');
  check(
    'El límite de auth no tumba el resto de la API',
    catalogoSigue.status === 200,
    `GET /machines status=${catalogoSigue.status}`,
  );

  // ================================================================ resumen
  console.log(`\n${'═'.repeat(76)}`);
  console.log(`  RESULTADO: ${passed} pruebas OK, ${failed} fallidas`);
  console.log('═'.repeat(76));
  console.log('\n  Nota: para repetir la prueba, reinicia `pnpm dev` y corre `pnpm seed`');
  console.log('  (el rate limit de /auth queda agotado 15 minutos).\n');
  if (failed > 0) process.exit(1);
=======
// ─── Escenario ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const stamp = Date.now();
  const email = `qa.${stamp}@vendmax.co`;
  const password = 'Vendmax2026!';
  const machineCode = `VM-9${String(stamp % 100).padStart(2, '0')}`;

  console.log('═'.repeat(72));
  console.log(`  VendMax API — prueba end-to-end  (${BASE_URL})`);
  console.log('═'.repeat(72));

  // 0. Health
  section('0. Healthcheck');
  const health = await call('GET', '/health');
  check('GET /health → 200', health.status === 200, `status=${health.status}`);

  // 1. Registro
  section('1. Registro');
  const register = await call('POST', '/auth/register', {
    body: { email, password, name: 'QA Automatizado' },
  });
  check('POST /auth/register → 201', register.status === 201, `status=${register.status}`);
  check(
    'La respuesta NO expone la contraseña',
    typeof register.body === 'object' && register.body !== null && !('password' in register.body),
  );

  const duplicate = await call('POST', '/auth/register', {
    body: { email, password, name: 'QA Duplicado' },
  });
  check('Email repetido → 409', duplicate.status === 409, `status=${duplicate.status}`);

  const weak = await call('POST', '/auth/register', {
    body: { email: `weak.${stamp}@vendmax.co`, password: '123', name: 'X' },
  });
  check('Contraseña débil → 400', weak.status === 400, `status=${weak.status}`);

  // 2. Login + cookies
  section('2. Login y cookies HttpOnly');
  const login = await call('POST', '/auth/login', { body: { email, password } });
  check('POST /auth/login → 200', login.status === 200, `status=${login.status}`);
  check(
    'Set-Cookie accessToken con HttpOnly',
    login.setCookies.some((c) => c.startsWith('accessToken=') && /HttpOnly/i.test(c)),
  );
  check(
    'Set-Cookie refreshToken con HttpOnly y Path=/api/v1/auth',
    login.setCookies.some(
      (c) => c.startsWith('refreshToken=') && /HttpOnly/i.test(c) && /Path=\/api\/v1\/auth/i.test(c),
    ),
  );
  check(
    'El token NO viene en el body de la respuesta',
    !JSON.stringify(login.body ?? {}).includes('eyJ'),
  );

  const badLogin = await call('POST', '/auth/login', {
    body: { email, password: 'ClaveIncorrecta9!' },
    withCookies: false,
  });
  const unknownUser = await call('POST', '/auth/login', {
    body: { email: `nadie.${stamp}@vendmax.co`, password },
    withCookies: false,
  });
  check('Contraseña incorrecta → 401', badLogin.status === 401, `status=${badLogin.status}`);
  check(
    'Mismo mensaje para email inexistente y clave errada (anti user-enumeration)',
    JSON.stringify(badLogin.body) === JSON.stringify(unknownUser.body),
    JSON.stringify(badLogin.body),
  );

  // 3. Ruta protegida
  section('3. Ruta protegida /auth/me');
  const me = await call('GET', '/auth/me');
  check('GET /auth/me con cookie → 200', me.status === 200, `status=${me.status}`);
  const meNoCookie = await call('GET', '/auth/me', { withCookies: false });
  check('GET /auth/me sin cookie → 401', meNoCookie.status === 401, `status=${meNoCookie.status}`);

  // 4. CRUD del recurso
  section('4. CRUD de máquinas expendedoras');
  const noAuthList = await call('GET', '/machines', { withCookies: false });
  check('GET /machines sin cookie → 401', noAuthList.status === 401, `status=${noAuthList.status}`);

  const created = await call('POST', '/machines', {
    body: {
      code: machineCode,
      model: 'SnackMaster 3000',
      type: 'snacks',
      location: 'Sede QA — Piso 1',
      slots: 30,
    },
  });
  check('POST /machines → 201', created.status === 201, `status=${created.status}`);
  const machineId: string = created.body?._id ?? '';
  check('La máquina creada trae _id y createdBy', Boolean(machineId && created.body?.createdBy));

  const dup = await call('POST', '/machines', {
    body: {
      code: machineCode,
      model: 'Otro',
      type: 'snacks',
      location: 'Sede QA — Piso 2',
      slots: 10,
    },
  });
  check('Código duplicado → 409', dup.status === 409, `status=${dup.status}`);

  const invalid = await call('POST', '/machines', {
    body: { code: 'XX-1', model: 'A', type: 'nave-espacial', location: 'x', slots: 0 },
  });
  check('Payload inválido → 400', invalid.status === 400, `status=${invalid.status}`);

  const list = await call('GET', '/machines?limit=100');
  const listItems: any[] = list.body?.data ?? [];
  check('GET /machines → 200', list.status === 200, `status=${list.status}`);
  check(
    'El listado incluye la máquina creada',
    listItems.some((m) => m.code === machineCode),
    `total=${list.body?.meta?.total}`,
  );

  const detail = await call('GET', `/machines/${machineId}`);
  check('GET /machines/:id → 200', detail.status === 200, `status=${detail.status}`);

  const notFound = await call('GET', '/machines/64b7f3c2a4d1e2f3a4b5c6d7');
  check('GET /machines/:id inexistente → 404', notFound.status === 404, `status=${notFound.status}`);

  const badId = await call('GET', '/machines/no-es-un-objectid');
  check('GET /machines/:id malformado → 400', badId.status === 400, `status=${badId.status}`);

  const patched = await call('PATCH', `/machines/${machineId}`, {
    body: { status: 'mantenimiento', notes: 'Revisión programada por QA' },
  });
  check('PATCH /machines/:id → 200', patched.status === 200, `status=${patched.status}`);
  check('El cambio se aplicó', patched.body?.status === 'mantenimiento', `status=${patched.body?.status}`);

  await call('PATCH', `/machines/${machineId}`, { body: { status: 'fuera_de_servicio' } });
  const illegalTransition = await call('PATCH', `/machines/${machineId}`, {
    body: { status: 'operativa' },
  });
  check(
    "Regla de negocio: 'fuera_de_servicio' → 'operativa' bloqueado (409)",
    illegalTransition.status === 409,
    `status=${illegalTransition.status}`,
  );

  await call('PATCH', `/machines/${machineId}`, { body: { cashBalanceCents: 50000 } });
  const deleteWithCash = await call('DELETE', `/machines/${machineId}`);
  check(
    'Regla de negocio: no se elimina con recaudo pendiente (409)',
    deleteWithCash.status === 409,
    `status=${deleteWithCash.status}`,
  );
  await call('PATCH', `/machines/${machineId}`, { body: { cashBalanceCents: 0 } });

  // 5. Refresh con rotación
  section('5. Refresh token con rotación');
  const oldRefresh = jar.get('refreshToken') ?? '';
  const refreshed = await call('POST', '/auth/refresh');
  check('POST /auth/refresh → 200', refreshed.status === 200, `status=${refreshed.status}`);
  const newRefresh = jar.get('refreshToken') ?? '';
  check('El refresh token cambió (rotación)', Boolean(newRefresh) && newRefresh !== oldRefresh);

  const meAfterRefresh = await call('GET', '/auth/me');
  check('El nuevo access token sirve → 200', meAfterRefresh.status === 200);

  const replay = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: `refreshToken=${oldRefresh}` },
  });
  check('Reutilizar el refresh token viejo → 401', replay.status === 401, `status=${replay.status}`);

  // 6. Eliminación
  section('6. Eliminación del recurso');
  const removed = await call('DELETE', `/machines/${machineId}`);
  check('DELETE /machines/:id → 204', removed.status === 204, `status=${removed.status}`);
  const afterDelete = await call('GET', `/machines/${machineId}`);
  check('El recurso ya no existe → 404', afterDelete.status === 404, `status=${afterDelete.status}`);

  // 7. Logout
  section('7. Logout e invalidación en base de datos');
  const refreshBeforeLogout = jar.get('refreshToken') ?? '';
  const logout = await call('POST', '/auth/logout');
  check('POST /auth/logout → 200', logout.status === 200, `status=${logout.status}`);
  check(
    'Las cookies se limpian en la respuesta',
    logout.setCookies.some((c) => c.startsWith('accessToken=;') || c.startsWith('accessToken=;')),
  );

  const refreshAfterLogout = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: `refreshToken=${refreshBeforeLogout}` },
  });
  check(
    'Refresh después de logout → 401 (hash borrado en DB)',
    refreshAfterLogout.status === 401,
    `status=${refreshAfterLogout.status}`,
  );

  const meAfterLogout = await call('GET', '/auth/me');
  check('GET /auth/me después de logout → 401', meAfterLogout.status === 401, `status=${meAfterLogout.status}`);

  // ─── Resumen ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(72));
  console.log(`  RESULTADO: ${passed} pruebas OK, ${failed} fallidas`);
  console.log('═'.repeat(72) + '\n');
  process.exit(failed === 0 ? 0 : 1);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}

main().catch((err: unknown) => {
  console.error('\n❌ No se pudo completar la prueba:', err);
<<<<<<< HEAD
  console.error('   ¿Está corriendo el servidor? → pnpm dev');
=======
  console.error('   ¿Está corriendo el servidor? → pnpm dev\n');
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  process.exit(1);
});
