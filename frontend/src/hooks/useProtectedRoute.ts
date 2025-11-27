import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';

interface ProtectedRouteResult {
  token: string | null;
  isChecking: boolean;
}

/**
 * Hook personalizado para proteger rutas que requieren autenticación.
 * Redirige al usuario a la página de login si no está autenticado.
 * 
 * @returns {ProtectedRouteResult} Objeto con el token y estado de verificación
 */
export const useProtectedRoute = (): ProtectedRouteResult => {
  const router = useRouter();
  const { token } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!token) {
          router.replace('/login');
        }
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [token, router]);
  
  return { token, isChecking };
}; 