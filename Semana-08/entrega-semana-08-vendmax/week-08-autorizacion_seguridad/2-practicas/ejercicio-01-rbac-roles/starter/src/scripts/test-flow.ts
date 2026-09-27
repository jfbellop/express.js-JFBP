import 'dotenv/config';

// ============================================================================
// PRUEBA AUTOMÁTICA — Ejercicio 01: RBAC con requireRole()
// ============================================================================
// Recorre la matriz de permisos completa: ruta pública, ruta autenticada y
// ruta de administrador, con los tres estados posibles (sin token, token de
// rol 'user', token de rol 'admin').
//
// Uso:
//   1. pnpm mongo     (terminal 1)
//   2. pnpm seed      (una vez)
//   3. pnpm dev       (terminal 2)
//   4. pnpm test:flow (terminal 3)
// ============================================================================

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api/v1`;

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, extra = ''): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

interface CallOptions {
  method?: string;
  token?: string;
  body?: unknown;
  rawAuthHeader?: string;
}

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function call(path: string, options: CallOptions = {}): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.rawAuthHeader) headers.Authorization = options.rawAuthHeader;

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
  return { status: res.status, body };
}

// Decodifica el payload de un JWT sin verificar la firma (solo para inspección)
function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
}

async function main(): Promise<void> {
  console.log('═'.repeat(72));
  console.log(`  Ejercicio 01 — RBAC con requireRole()  (${BASE_URL})`);
  console.log('═'.repeat(72));

  // ---------------------------------------------------------------- 0
  section('0. Ruta pública (sin middleware de autenticación)');
  const health = await call('/health');
  check('GET /health → 200', health.status === 200, `status=${health.status}`);

  const pub = await call('/public');
  check('GET /public SIN token → 200', pub.status === 200, `status=${pub.status}`);

  // ---------------------------------------------------------------- 1
  section('1. Sin autenticación: todo lo privado responde 401');
  const dashNoToken = await call('/dashboard');
  check('GET /dashboard sin token → 401', dashNoToken.status === 401, `status=${dashNoToken.status}`);

  const adminNoToken = await call('/admin/users');
  check(
    'GET /admin/users sin token → 401',
    adminNoToken.status === 401,
    `status=${adminNoToken.status}`,
  );

  const malformed = await call('/dashboard', { rawAuthHeader: 'Token abc123' });
  check(
    'Header Authorization malformado → 401',
    malformed.status === 401,
    `status=${malformed.status}`,
  );

  const badToken = await call('/dashboard', { token: 'no.es.un.jwt' });
  check('Token inválido → 401', badToken.status === 401, `status=${badToken.status}`);

  // ---------------------------------------------------------------- 2
  section('2. Login como rol "user"');
  const loginUser = await call('/auth/login', {
    method: 'POST',
    body: { email: 'user@test.com', password: 'User1234!' },
  });
  check('POST /auth/login (user) → 200', loginUser.status === 200, `status=${loginUser.status}`);
  const userToken = loginUser.body.accessToken as string;
  check('La respuesta trae accessToken', typeof userToken === 'string' && userToken.length > 20);
  check('La respuesta trae role=user', loginUser.body.role === 'user', `role=${String(loginUser.body.role)}`);

  const userPayload = userToken ? decodeJwtPayload(userToken) : {};
  check(
    'PASO 2/3 — el JWT contiene el campo role',
    userPayload.role === 'user',
    `payload.role=${String(userPayload.role)}`,
  );
  check(
    'El JWT contiene sub y email',
    typeof userPayload.sub === 'string' && typeof userPayload.email === 'string',
  );

  // ---------------------------------------------------------------- 3
  section('3. Rol "user": entra a lo suyo, NO a lo de admin');
  const dashUser = await call('/dashboard', { token: userToken });
  check('GET /dashboard con token user → 200', dashUser.status === 200, `status=${dashUser.status}`);

  const usersDashUser = await call('/users/dashboard', { token: userToken });
  check(
    'GET /users/dashboard con token user → 200',
    usersDashUser.status === 200,
    `status=${usersDashUser.status}`,
  );

  const adminUsersAsUser = await call('/admin/users', { token: userToken });
  check(
    'GET /admin/users con token user → 403 (no 401)',
    adminUsersAsUser.status === 403,
    `status=${adminUsersAsUser.status}`,
  );
  check(
    'El 403 explica qué rol hacía falta',
    String(adminUsersAsUser.body.error ?? '').includes('admin'),
    String(adminUsersAsUser.body.error ?? ''),
  );

  const adminStatsAsUser = await call('/admin/stats', { token: userToken });
  check(
    'GET /admin/stats con token user → 403',
    adminStatsAsUser.status === 403,
    `status=${adminStatsAsUser.status}`,
  );

  // ---------------------------------------------------------------- 4
  section('4. Login como rol "admin"');
  const loginAdmin = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@test.com', password: 'Admin1234!' },
  });
  check('POST /auth/login (admin) → 200', loginAdmin.status === 200, `status=${loginAdmin.status}`);
  const adminToken = loginAdmin.body.accessToken as string;
  const adminPayload = adminToken ? decodeJwtPayload(adminToken) : {};
  check(
    'El JWT del admin lleva role=admin',
    adminPayload.role === 'admin',
    `payload.role=${String(adminPayload.role)}`,
  );

  // ---------------------------------------------------------------- 5
  section('5. Rol "admin": acceso total');
  const adminUsers = await call('/admin/users', { token: adminToken });
  check('GET /admin/users con token admin → 200', adminUsers.status === 200, `status=${adminUsers.status}`);
  check(
    'Devuelve la lista de usuarios',
    typeof adminUsers.body.total === 'number' && (adminUsers.body.total as number) >= 2,
    `total=${String(adminUsers.body.total)}`,
  );

  const adminStats = await call('/admin/stats', { token: adminToken });
  check('GET /admin/stats con token admin → 200', adminStats.status === 200, `status=${adminStats.status}`);

  const dashAdmin = await call('/dashboard', { token: adminToken });
  check(
    'GET /dashboard con token admin → 200 (ruta de ambos roles)',
    dashAdmin.status === 200,
    `status=${dashAdmin.status}`,
  );

  // ---------------------------------------------------------------- 6
  section('6. /auth/me y principio de menor privilegio en el registro');
  const meAdmin = await call('/auth/me', { token: adminToken });
  check('GET /auth/me con token admin → 200', meAdmin.status === 200, `status=${meAdmin.status}`);

  const nuevoEmail = `nuevo_${Date.now()}@test.com`;
  const register = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Usuario Nuevo', email: nuevoEmail, password: 'Nuevo1234!' },
  });
  check('POST /auth/register → 201', register.status === 201, `status=${register.status}`);
  const registered = (register.body.data ?? {}) as Record<string, unknown>;
  check(
    'El usuario nuevo nace con role=user (menor privilegio)',
    registered.role === 'user',
    `role=${String(registered.role)}`,
  );

  const loginNuevo = await call('/auth/login', {
    method: 'POST',
    body: { email: nuevoEmail, password: 'Nuevo1234!' },
  });
  const nuevoToken = loginNuevo.body.accessToken as string;
  const adminConNuevo = await call('/admin/users', { token: nuevoToken });
  check(
    'El usuario recién registrado NO puede entrar a /admin → 403',
    adminConNuevo.status === 403,
    `status=${adminConNuevo.status}`,
  );

  // ---------------------------------------------------------------- resumen
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  RESULTADO: ${passed} pruebas OK, ${failed} fallidas`);
  console.log('═'.repeat(72));
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('\n❌ No se pudo completar la prueba:', err);
  console.error('   ¿Está corriendo el servidor? → pnpm dev');
  process.exit(1);
});
