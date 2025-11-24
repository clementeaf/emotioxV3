import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Research } from '../services/research.service';

/**
 * Hook para redirigir automáticamente al módulo Welcome Screen
 * cuando se entra a /builder sin módulo específico
 */
export const useWelcomeScreenRedirect = (
    research: Research | null,
    loading: boolean,
    activeModuleId: string | null,
    isSettings: boolean,
    researchId: string | undefined
) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // No redirigir si:
        // - No hay research cargado o está cargando
        // - Ya hay un módulo activo en la URL
        // - Estamos explícitamente en settings
        // - La ruta no es exactamente /research/:id/builder
        const isBaseBuilderRoute = location.pathname === `/research/${researchId}/builder`;
        
        if (!research || loading || activeModuleId || isSettings || !isBaseBuilderRoute || !researchId) {
            return;
        }

        let welcomeScreenModule = null;

        // Primero buscar el módulo "Welcome Screen" en cualquier stage
        for (const stage of research.stages || []) {
            const module = stage.modules?.find((m) => m.name === 'Welcome Screen');
            if (module) {
                welcomeScreenModule = module;
                break;
            }
        }

        // Si no encontramos el módulo, buscar el stage "Welcome Screen" y usar su primer módulo
        if (!welcomeScreenModule) {
            const welcomeScreenStage = research.stages?.find((stage) => stage.name === 'Welcome Screen');
            if (welcomeScreenStage && welcomeScreenStage.modules && welcomeScreenStage.modules.length > 0) {
                welcomeScreenModule = welcomeScreenStage.modules[0];
            }
        }

        // Si encontramos el módulo Welcome Screen, redirigir a él
        if (welcomeScreenModule) {
            navigate(`/research/${researchId}/builder/module/${welcomeScreenModule.id}`, { replace: true });
        }
    }, [research, loading, activeModuleId, isSettings, researchId, navigate, location.pathname]);
};

