import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';

// ============================================================================
// HASH DEL REFRESH TOKEN
// ============================================================================
// ⚠️ Detalle crítico descubierto probando la rotación:
//
// bcrypt SOLO procesa los primeros 72 bytes de su entrada (limitación del
// algoritmo, no de la librería). Un JWT mide ~250-400 caracteres y dos refresh
// tokens del mismo usuario comparten los primeros ~90 (header idéntico +
// comienzo del payload con el mismo `sub`). Resultado: al hashear el JWT
// completo, bcrypt.compare() daba `true` para un refresh token YA ROTADO
// → el token viejo seguía sirviendo y la rotación no protegía de nada.
//
// Solución estándar (la que usan los password managers): comprimir primero el
// token a un digest SHA-256 de 44 caracteres — que sí cabe entero en los 72
// bytes — y almacenar el hash bcrypt de ese digest.
//
// SHA-256 aquí es suficiente y correcto porque el JWT es material de alta
// entropía generado por el servidor (no una contraseña humana adivinable).
// ============================================================================

const SALT_ROUNDS = 10;

/** Comprime el token a 44 caracteres sin perder unicidad. */
function digest(token: string): string {
  return createHash('sha256').update(token).digest('base64');
}

/** Hash que se guarda en `user.refreshToken`. */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(digest(token), SALT_ROUNDS);
}

/** Comparación en tiempo constante contra el hash almacenado. */
export async function compareRefreshToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(digest(token), hash);
}
