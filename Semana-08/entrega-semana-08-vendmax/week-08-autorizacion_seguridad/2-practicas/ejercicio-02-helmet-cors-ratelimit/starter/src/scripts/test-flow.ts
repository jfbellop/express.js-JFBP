import 'dotenv/config';

// ============================================================================
// PRUEBA AUTOMÁTICA — Ejercicio 02: Helmet + CORS + Rate Limiting + Sanitize
// ============================================================================
// Verifica las cuatro capas de seguridad HTTP sobre el servidor levantado.
//
// Uso:
//   1. pnpm mongo     (terminal 1)
//   2. pnpm seed      (una vez)
//   3. pnpm dev       (terminal 2)
//   4. pnpm test:flow (terminal 3)
//
// ⚠️ IMPORTANTE: la última sección agota a propósito el rate limit de /login
// (5 intentos / 15 min). Si vuelves a ejecutar esta prueba sin reiniciar el
// servidor, los logins responderán 429: eso no es un fallo, es la prueba de
// que el limitador funciona. Reinicia `pnpm dev` y vuelve a correrla.
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
  body?: unknown;
  origin?: string;
  token?: string;
}

interface CallResult {
  status: number;
  headers: Headers;
  body: Record<string, unknown>;
}

async function call(path: string, options: CallOptions = {}): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.origin) headers.Origin = options.origin;
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

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

async function main(): Promise<void> {
  console.log('═'.repeat(72));
  console.log(`  Ejercicio 02 — Capas de seguridad HTTP  (${BASE_URL})`);
  console.log('═'.repeat(72));

  // ---------------------------------------------------------------- 1
  section('1. Helmet — cabeceras de seguridad (PASO 1)');
  const health = await call('/health');
  check('GET /health → 200', health.status === 200, `status=${health.status}`);

  const h = health.headers;
  check(
    'X-Content-Type-Options: nosniff',
    h.get('x-content-type-options') === 'nosniff',
    String(h.get('x-content-type-options')),
  );
  check(
    'X-Frame-Options presente (anti clickjacking)',
    h.get('x-frame-options') !== null,
    String(h.get('x-frame-options')),
  );
  check(
    'Strict-Transport-Security presente (HSTS)',
    (h.get('strict-transport-security') ?? '').includes('max-age'),
    String(h.get('strict-transport-security')),
  );
  check(
    'Content-Security-Policy presente',
    h.get('content-security-policy') !== null,
    (h.get('content-security-policy') ?? '').slice(0, 40) + '...',
  );
  check(
    'X-DNS-Prefetch-Control presente',
    h.get('x-dns-prefetch-control') !== null,
    String(h.get('x-dns-prefetch-control')),
  );
  check(
    'X-Powered-By eliminado (no revela el stack)',
    h.get('x-powered-by') === null,
    `x-powered-by=${String(h.get('x-powered-by'))}`,
  );

  // ---------------------------------------------------------------- 2
  section('2. Rate limiting global — 100 req / 15 min (PASO 2)');
  check(
    'RateLimit-Limit = 100',
    h.get('ratelimit-limit') === '100',
    `RateLimit-Limit=${String(h.get('ratelimit-limit'))}`,
  );
  check(
    'RateLimit-Remaining presente',
    h.get('ratelimit-remaining') !== null,
    `RateLimit-Remaining=${String(h.get('ratelimit-remaining'))}`,
  );
  check(
    'X-RateLimit-Remaining presente (formato legacy que pide la rúbrica)',
    h.get('x-ratelimit-remaining') !== null,
    `X-RateLimit-Remaining=${String(h.get('x-ratelimit-remaining'))}`,
  );
  const health2 = await call('/health');
  const rem1 = Number(h.get('ratelimit-remaining'));
  const rem2 = Number(health2.headers.get('ratelimit-remaining'));
  check('El contador baja en cada request', rem2 < rem1, `${rem1} → ${rem2}`);

  // ---------------------------------------------------------------- 3
  section('3. CORS con whitelist (PASO 4)');
  const corsOk = await call('/health', { origin: 'http://localhost:5173' });
  check(
    'Origen permitido recibe Access-Control-Allow-Origin',
    corsOk.headers.get('access-control-allow-origin') === 'http://localhost:5173',
    String(corsOk.headers.get('access-control-allow-origin')),
  );
  check(
    'Access-Control-Allow-Credentials: true (necesario para cookies)',
    corsOk.headers.get('access-control-allow-credentials') === 'true',
    String(corsOk.headers.get('access-control-allow-credentials')),
  );

  const corsBad = await call('/health', { origin: 'http://evil.com' });
  check(
    'Origen NO permitido es rechazado (403, no 500)',
    corsBad.status === 403,
    `status=${corsBad.status} ${JSON.stringify(corsBad.body)}`,
  );
  check(
    'Al origen bloqueado NO se le devuelve Access-Control-Allow-Origin',
    corsBad.headers.get('access-control-allow-origin') === null,
    String(corsBad.headers.get('access-control-allow-origin')),
  );

  const preflight = await fetch(`${BASE_URL}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  check(
    'Preflight OPTIONS desde origen permitido → 204/200',
    preflight.status === 204 || preflight.status === 200,
    `status=${preflight.status}`,
  );
  check(
    'El preflight declara los métodos permitidos',
    (preflight.headers.get('access-control-allow-methods') ?? '').includes('PATCH'),
    String(preflight.headers.get('access-control-allow-methods')),
  );

  // ---------------------------------------------------------------- 4
  section('4. NoSQL injection — express-mongo-sanitize (PASO 5)');
  const injection = await call('/auth/login', {
    method: 'POST',
    body: { email: { $gt: '' }, password: { $gt: '' } },
  });
  check(
    'Login con operadores $gt NO autentica',
    injection.status !== 200,
    `status=${injection.status} ${JSON.stringify(injection.body).slice(0, 80)}`,
  );
  check(
    'Responde 400/401, nunca 500 ni un token',
    injection.status === 400 || injection.status === 401,
    `status=${injection.status}`,
  );
  check(
    'La respuesta no contiene accessToken',
    injection.body.accessToken === undefined,
  );

  const injectionQuery = await call('/health?$where=sleep(1000)');
  check(
    'Los operadores en la query string tampoco rompen la API',
    injectionQuery.status === 200,
    `status=${injectionQuery.status}`,
  );

  // ---------------------------------------------------------------- 5
  section('5. Login legítimo y errores sin stack trace');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'user@test.com', password: 'User1234!' },
  });
  check('POST /auth/login con credenciales válidas → 200', login.status === 200, `status=${login.status}`);
  const token = login.body.accessToken as string;
  check('Devuelve accessToken', typeof token === 'string' && token.length > 20);

  const dashboard = await call('/users/dashboard', { token });
  check('GET /users/dashboard con token → 200', dashboard.status === 200, `status=${dashboard.status}`);

  const notFound = await call('/ruta-que-no-existe');
  check('Ruta inexistente → 404', notFound.status === 404, `status=${notFound.status}`);
  check(
    'El error no expone stack trace ni rutas internas',
    !JSON.stringify(notFound.body).includes('at ') &&
      !JSON.stringify(notFound.body).includes('node_modules'),
    JSON.stringify(notFound.body),
  );

  // ---------------------------------------------------------------- 6
  section('6. Rate limit de autenticación — 5 intentos / 15 min (PASO 3)');
  console.log('     (se agotan los intentos a propósito: el 6º debe dar 429)');
  let lastStatus = 0;
  let tooManyAt = 0;
  for (let i = 1; i <= 8; i++) {
    const attempt = await call('/auth/login', {
      method: 'POST',
      body: { email: 'user@test.com', password: 'ClaveIncorrecta1!' },
    });
    lastStatus = attempt.status;
    if (attempt.status === 429 && tooManyAt === 0) tooManyAt = i;
  }
  check(
    'Tras agotar los intentos responde 429 Too Many Requests',
    lastStatus === 429,
    `último status=${lastStatus}, primer 429 en el intento #${tooManyAt}`,
  );
  check(
    'El bloqueo se activa dentro de los primeros 6 intentos',
    tooManyAt > 0 && tooManyAt <= 6,
    `intento=${tooManyAt}`,
  );

  const blocked = await call('/auth/login', {
    method: 'POST',
    body: { email: 'user@test.com', password: 'User1234!' },
  });
  check(
    'Ni con la contraseña correcta se pasa el bloqueo',
    blocked.status === 429,
    `status=${blocked.status}`,
  );
  check(
    'El 429 trae un mensaje claro, sin detalles internos',
    String(JSON.stringify(blocked.body)).toLowerCase().includes('too many'),
    JSON.stringify(blocked.body),
  );

  const stillOk = await call('/health');
  check(
    'El limitador de auth NO bloquea el resto de la API',
    stillOk.status === 200,
    `GET /health status=${stillOk.status}`,
  );

  // ---------------------------------------------------------------- resumen
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  RESULTADO: ${passed} pruebas OK, ${failed} fallidas`);
  console.log('═'.repeat(72));
  console.log('\n  Nota: para repetir la prueba hay que reiniciar `pnpm dev`');
  console.log('  (el rate limit de /login quedó agotado durante 15 minutos).\n');
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('\n❌ No se pudo completar la prueba:', err);
  console.error('   ¿Está corriendo el servidor? → pnpm dev');
  process.exit(1);
});
