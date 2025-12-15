/**
 * EJEMPLO: Hook simple de autenticación
 * 
 * LIMITACIONES de este enfoque:
 * 1. ❌ No hay persistencia - el token se pierde al recargar
 * 2. ❌ Cada componente tiene su propio estado - no sincronizado
 * 3. ❌ El interceptor de Axios no puede acceder al token
 * 4. ❌ Prop drilling si necesitas el estado en múltiples componentes
 * 5. ❌ Re-renders innecesarios si usas Context API
 */

import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import type { User, LoginCredentials } from '../types/auth';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ❌ Problema: Necesitarías leer de localStorage en cada componente
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // ❌ Problema: Cada componente que use este hook tiene su propio estado
    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await authService.login(credentials);
            if (response.token) {
                setToken(response.token);
                localStorage.setItem('token', response.token);
            }
            
            const userResponse = await authService.getMe();
            setUser(userResponse.user);
            localStorage.setItem('user', JSON.stringify(userResponse.user));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // ❌ Problema: Si otro componente hace logout, este componente no se entera
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return {
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        error,
        login,
        logout,
    };
};

