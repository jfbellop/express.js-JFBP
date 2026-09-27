import 'dotenv/config';

// ============================================================================
// PRUEBA END-TO-END DEL FLUJO COMPLETO — VendMax API (Semana 07)
// ============================================================================
// Recorre los mismos casos que pide la rúbrica (auth + CRUD + 401/404/409 +
// rotación de refresh + logout) y los verifica automáticamente.
//
// Uso:
//   1. Terminal A: pnpm dev
//   2. Terminal B: pnpm test:flow
// ============================================================================

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api/v1`;

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
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

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
}

main().catch((err: unknown) => {
  console.error('\n❌ No se pudo completar la prueba:', err);
  console.error('   ¿Está corriendo el servidor? → pnpm dev\n');
  process.exit(1);
});
