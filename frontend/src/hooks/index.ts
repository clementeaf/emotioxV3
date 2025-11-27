/**
 * Índice centralizado para hooks personalizados
 */

// Hook para la carga de archivos
// export * from './useApi'; // Removed - migrated to domain architecture
// ❌ ELIMINADO: useAuth legacy - usar AuthProvider de contexts/AuthContext
export * from './useWebSocket';
export * from './useProtectedRoute';
export * from './useFileUpload';
export * from './useErrorLog'; 