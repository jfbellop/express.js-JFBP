import { Router } from 'express';

// ============================================
// RUTAS PÚBLICAS — sin authMiddleware ni requireRole
// ============================================
// La rúbrica pide demostrar los tres niveles de acceso:
//   1. Público            → sin middleware            (este archivo)
//   2. Autenticado        → authMiddleware            (user.routes.ts)
//   3. Solo administrador → + requireRole('admin')    (admin.routes.ts)
// ============================================

const router = Router();

// GET /api/v1/public — cualquiera puede llamarla, con o sin token
router.get('/public', (_req, res) => {
  res.json({
    message: 'Ruta pública: no requiere autenticación',
    access: { requiresAuth: false, requiredRole: null },
  });
});

// GET /api/v1/health — verificación de vida de la API
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'rbac-ejercicio',
    timestamp: new Date().toISOString(),
  });
});

export default router;
