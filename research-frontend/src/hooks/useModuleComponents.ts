import { useMemo, useState, useEffect, useRef } from 'react';
import type { ComponentConfig } from '../types/moduleBuilder.types';
import type { Module } from '../services/research.service';
import { useModuleTemplates } from './useModuleTemplatesQuery';
import type { ModuleTemplate } from '../services/moduleTemplates.service';
import { useModuleDraftStore } from '../stores/useModuleDraftStore';

interface UseModuleComponentsResult {
    components: ComponentConfig[];
    setComponents: React.Dispatch<React.SetStateAction<ComponentConfig[]>>;
    componentValues: Record<string, string>;
    setComponentValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

/**
 * Serializa un valor de componente a string para inputs controlados.
 * @param value - Valor original (posiblemente desconocido)
 * @returns Valor serializado
 */
function serializeComponentValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null || value === undefined) return '';
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * Extrae componentes desde config del módulo (formato nuevo/antiguo).
 * @param activeModule - Módulo activo
 * @returns Lista de componentes encontrados
 */
function getComponentsFromConfig(activeModule: Module): ComponentConfig[] {
    if (!activeModule.config || typeof activeModule.config !== 'object') return [];

    if ('structure' in activeModule.config) {
        const structure = activeModule.config.structure as { components?: ComponentConfig[] };
        if (structure?.components && Array.isArray(structure.components) && structure.components.length > 0) {
            return structure.components;
        }
    }

    if ('components' in activeModule.config) {
        const components = activeModule.config.components as ComponentConfig[];
        if (Array.isArray(components) && components.length > 0) {
            return components;
        }
    }

    return [];
}

/**
 * Convierte questions del módulo al formato ComponentConfig.
 * @param activeModule - Módulo activo
 * @returns Lista de componentes derivados de questions
 */
function getComponentsFromQuestions(activeModule: Module): ComponentConfig[] {
    if (!activeModule.questions || activeModule.questions.length === 0) return [];

    return activeModule.questions.map((question) => ({
        id: question.id,
        type: question.type as ComponentConfig['type'],
        label: question.text,
        ...(question.config && typeof question.config === 'object' ? question.config : {}),
    }));
}

/**
 * Busca un template activo compatible con el módulo.
 * @param templates - Lista de templates disponibles
 * @param moduleName - Nombre del módulo
 * @returns Template encontrado o null
 */
function findActiveTemplateByModuleName(templates: ModuleTemplate[] | undefined, moduleName: string): ModuleTemplate | null {
    if (!templates || templates.length === 0) return null;
    const template = templates.find((t) => t.name === moduleName && t.is_active);
    return template ?? null;
}

/**
 * Construye el mapa inicial de valores controlados para los componentes.
 * @param moduleComponents - Componentes del módulo
 * @returns Mapa id->valor inicial
 */
function buildInitialComponentValues(moduleComponents: ComponentConfig[]): Record<string, string> {
    const initialValues: Record<string, string> = {};

    moduleComponents.forEach((comp) => {
        if (comp.value !== undefined && comp.value !== null) {
            initialValues[comp.id] = serializeComponentValue(comp.value);
            return;
        }

        if (comp.settings?.readonly === true && comp.settings?.defaultValue) {
            initialValues[comp.id] = serializeComponentValue(comp.settings.defaultValue);
            return;
        }

        initialValues[comp.id] = '';
    });

    return initialValues;
}

/**
 * Hook personalizado para cargar componentes de un módulo
 * Busca componentes en: config.structure.components, config.components, questions, o template
 */
export const useModuleComponents = (activeModule: Module | null): UseModuleComponentsResult => {
    const [components, setComponents] = useState<ComponentConfig[]>([]);
    const [componentValues, setComponentValues] = useState<Record<string, string>>({});

    const { setDraft, getDraft } = useModuleDraftStore();

    // Refs to access latest values in cleanup (closures would be stale)
    const componentValuesRef = useRef(componentValues);
    const componentsRef = useRef(components);
    useEffect(() => { componentValuesRef.current = componentValues; }, [componentValues]);
    useEffect(() => { componentsRef.current = components; }, [components]);

    // Track original (server) values to detect real changes
    const originalValuesRef = useRef<Record<string, string>>({});

    // Save draft when navigating away — only if values actually differ from server
    const prevModuleIdRef = useRef<string | null>(null);
    useEffect(() => {
        const currentId = activeModule?.id ?? null;
        if (prevModuleIdRef.current && prevModuleIdRef.current !== currentId) {
            const vals = componentValuesRef.current;
            const comps = componentsRef.current;
            const original = originalValuesRef.current;
            // Compare current values against original — only draft if something changed
            const hasChanges = Object.keys(vals).some(k => vals[k] !== original[k]) ||
                Object.keys(original).some(k => vals[k] !== original[k]);
            if (hasChanges && Object.keys(vals).length > 0) {
                setDraft(prevModuleIdRef.current, vals, comps);
            }
        }
        prevModuleIdRef.current = currentId;
    }, [activeModule?.id, setDraft]);

    const shouldFetchTemplates = useMemo((): boolean => {
        if (!activeModule) return false;
        if (!activeModule.is_from_template) return false;

        const fromConfig = getComponentsFromConfig(activeModule);
        if (fromConfig.length > 0) return false;

        const fromQuestions = getComponentsFromQuestions(activeModule);
        if (fromQuestions.length > 0) return false;

        return true;
    }, [activeModule]);

    const { data: templates } = useModuleTemplates({ enabled: shouldFetchTemplates });

    const resolvedComponents = useMemo((): ComponentConfig[] => {
        if (!activeModule) return [];

        const fromConfig = getComponentsFromConfig(activeModule);
        if (fromConfig.length > 0) return fromConfig;

        const fromQuestions = getComponentsFromQuestions(activeModule);
        if (fromQuestions.length > 0) return fromQuestions;

        if (activeModule.is_from_template) {
            const template = findActiveTemplateByModuleName(templates, activeModule.name);
            const structure = template?.structure as { components?: ComponentConfig[] } | undefined;
            if (structure?.components && Array.isArray(structure.components)) {
                return structure.components;
            }
        }

        return [];
    }, [activeModule, templates]);

    // Stable content key: only reset state when component data actually changes,
    // not when React Query returns a new object reference with identical content.
    const resolvedContentKey = useMemo(
        () => JSON.stringify(resolvedComponents.map(c => ({ id: c.id, value: c.value }))),
        [resolvedComponents]
    );
    const prevContentKey = useRef('');

    useEffect(() => {
        // Only reset components and componentValues when the underlying data actually changed
        // (e.g. first load, module switch, or post-save refetch with new values).
        // Prevents React Query background refetches from wiping unsaved edits
        // or user-added/removed choice components.
        if (prevContentKey.current !== resolvedContentKey) {
            prevContentKey.current = resolvedContentKey;

            // Always track original server values for change detection
            const serverValues = buildInitialComponentValues(resolvedComponents);
            originalValuesRef.current = serverValues;

            // Restore draft if one exists for this module
            const moduleId = activeModule?.id;
            const draft = moduleId ? getDraft(moduleId) : undefined;
            if (draft) {
                setComponents(draft.components);
                setComponentValues(draft.componentValues);
            } else {
                setComponents(resolvedComponents);
                setComponentValues(serverValues);
            }
        }
    }, [resolvedComponents, resolvedContentKey, activeModule?.id, getDraft]);

    return {
        components,
        setComponents,
        componentValues,
        setComponentValues,
    };
};

