import 'dotenv/config';

// ============================================================================
// PRUEBA AUTOMÁTICA — Ejercicio 01: Registro y Login con JWT
// ============================================================================
// Uso:  Terminal A → pnpm dev     |     Terminal B → pnpm test:flow
// ============================================================================

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api/v1`;

const jar = new Map<string, string>();

function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorb(setCookies: string[]): void {
  for (const raw of setCookies) {
    const pair = raw.split(';')[0] ?? '';
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}

async function call(
  method: string,
  path: string,
  opts: { body?: unknown; withCookies?: boolean; rawCookie?: string } = {},
): Promise<{ status: number; body: any; setCookies: string[] }> {
  const { body, withCookies = true, rawCookie } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (rawCookie) headers['Cookie'] = rawCookie;
  else if (withCookies && jar.size > 0) headers['Cookie'] = cookieHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookies = res.headers.getSetCookie();
  if (withCookies && !rawCookie) absorb(setCookies);

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, setCookies };
}

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

async function main(): Promise<void> {
  const stamp = Date.now();
  const email = `qa.${stamp}@test.com`;
  const password = 'Test1234!';

  console.log('═'.repeat(70));
  console.log(`  Ejercicio 01 — Registro y Login  (${BASE_URL})`);
  console.log('═'.repeat(70));

  console.log('\n1. Registro');
  const reg = await call('POST', '/auth/register', {
    body: { email, password, name: 'Test User' },
  });
  check('POST /auth/register → 201', reg.status === 201, `status=${reg.status}`);
  check('La respuesta no incluye el campo password', !JSON.stringify(reg.body).includes('password'));
  check(
    'La contraseña se guardó hasheada (no aparece en claro)',
    !JSON.stringify(reg.body).includes(password),
  );

  const dup = await call('POST', '/auth/register', {
    body: { email, password, name: 'Otro' },
  });
  check('Email duplicado → 409', dup.status === 409, `status=${dup.status}`);

  const weak = await call('POST', '/auth/register', {
    body: { email: `weak.${stamp}@test.com`, password: 'abc', name: 'W' },
  });
  check('Contraseña que no cumple la política → 400', weak.status === 400, `status=${weak.status}`);

  console.log('\n2. Login');
  const login = await call('POST', '/auth/login', { body: { email, password } });
  check('POST /auth/login → 200', login.status === 200, `status=${login.status}`);
  const accessCookie = login.setCookies.find((c) => c.startsWith('accessToken='));
  check('Set-Cookie accessToken presente', Boolean(accessCookie));
  check('La cookie es HttpOnly', /HttpOnly/i.test(accessCookie ?? ''));
  check('La cookie declara SameSite', /SameSite/i.test(accessCookie ?? ''));
  check('El token NO viaja en el body', !JSON.stringify(login.body ?? {}).includes('eyJ'));

  const badPass = await call('POST', '/auth/login', {
    body: { email, password: 'OtraClave1!' },
    withCookies: false,
  });
  const noUser = await call('POST', '/auth/login', {
    body: { email: `fantasma.${stamp}@test.com`, password },
    withCookies: false,
  });
  check('Contraseña incorrecta → 401', badPass.status === 401, `status=${badPass.status}`);
  check('Email inexistente → 401', noUser.status === 401, `status=${noUser.status}`);
  check(
    'Mismo mensaje en ambos casos (anti user-enumeration)',
    JSON.stringify(badPass.body) === JSON.stringify(noUser.body),
    JSON.stringify(badPass.body),
  );

  console.log('\n3. Ruta protegida GET /auth/me');
  const me = await call('GET', '/auth/me');
  check('Con cookie válida → 200', me.status === 200, `status=${me.status}`);
  check(
    'Devuelve el usuario sin password',
    me.status === 200 && !JSON.stringify(me.body).includes('"password"'),
  );
  const noCookie = await call('GET', '/auth/me', { withCookies: false });
  check('Sin cookie → 401', noCookie.status === 401, `status=${noCookie.status}`);
  const fakeToken = await call('GET', '/auth/me', {
    rawCookie: 'accessToken=eyJhbGciOiJIUzI1NiJ9.token.falso',
  });
  check('Con token manipulado → 401', fakeToken.status === 401, `status=${fakeToken.status}`);

  console.log('\n' + '═'.repeat(70));
  console.log(`  RESULTADO: ${passed} OK, ${failed} fallidas`);
  console.log('═'.repeat(70) + '\n');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('\n❌ Error ejecutando la prueba:', err);
  console.error('   ¿Está corriendo el servidor? → pnpm dev\n');
  process.exit(1);
});
