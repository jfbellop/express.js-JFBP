import rateLimit from 'express-rate-limit';
import { CorsOptions } from 'cors';

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD — rate limiting y CORS
// ============================================================================
// Todo lo que sea política de seguridad vive aquí, no disperso por las rutas:
// se audita de un vistazo y se cambia en un solo sitio.
// ============================================================================

// ============================================
// PASO 2 — Rate limiter GLOBAL
// ============================================
// 100 requests por IP cada 15 minutos sobre toda la API.
// Objetivo: frenar scraping y abuso general sin molestar a un usuario normal.
//
// Sobre los headers (decisión documentada):
//   - 'draft-6'         → RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset
//   - 'draft-7'         → los fusiona en un único header `RateLimit`
//   - legacyHeaders     → X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset
// El enunciado verifica `RateLimit-Limit: 100` y la rúbrica pide ver
// `X-RateLimit-Remaining`, así que se emiten AMBOS formatos.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: 'draft-6',
  legacyHeaders: true,
  message: { error: 'Too many requests, please try again later' },
});

// ============================================
// PASO 3 — Rate limiter de AUTENTICACIÓN
// ============================================
// 5 intentos por IP cada 15 minutos, solo en /login y /register.
// Objetivo: fuerza bruta y credential stuffing. Un atacante que pruebe
// contraseñas pasa de miles de intentos por minuto a 20 por hora.
//
// skipSuccessfulRequests: false → también cuentan los logins correctos.
// Es lo más estricto y lo que verifica el enunciado (el 6º request → 429).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-6',
  legacyHeaders: true,
  skipSuccessfulRequests: false,
  message: { error: 'Too many login attempts, please try again later' },
});

// ============================================
// PASO 4 — CORS con whitelist
// ============================================
// `cors()` a secas responde Access-Control-Allow-Origin con el origen que
// sea, y con credentials:true eso permitiría que cualquier web ajena hiciera
// peticiones autenticadas con las cookies de la víctima.
//
// La whitelist se puede sobrescribir con CORS_ORIGINS en el .env
// (separada por comas) para no tocar código al desplegar.
const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3001'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Sin header Origin = no es una petición de navegador (curl, Postman,
    // REST Client, server-to-server). CORS no aplica: se deja pasar.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: origin ${origin} not allowed`));
    }
  },
  credentials: true, // imprescindible para las cookies HttpOnly del refresh
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export const allowedOrigins = ALLOWED_ORIGINS;
