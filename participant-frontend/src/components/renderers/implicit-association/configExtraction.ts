import type { ModuleComponent } from '../../../types/module';
import type { ModuleConfig } from '../../../types/module';
import { resolveMultiLang } from '../../../utils/multiLang';
import i18n from '../../../i18n';
import { getComponentText, getFileUploadMediaRef } from '../../../utils/moduleComponent';
import { resolveMediaUrl } from '../../../services/media.service';
import type { IATTarget, IATCriteriaItem, IATExtractedConfig } from './types';

// ---------------------------------------------------------------------------
// Media resolution helper
// ---------------------------------------------------------------------------

function hasUploadError(component: ModuleComponent | undefined): boolean {
    if (!component || component.type !== 'file-upload') return false;
    const v = component.value;
    let items: unknown[] | null = null;
    if (Array.isArray(v)) items = v;
    else if (typeof v === 'string' && v.trim().startsWith('[')) {
        try { items = JSON.parse(v); } catch { return false; }
    }
    if (!Array.isArray(items) || items.length === 0) return false;
    const first = items[0] as Record<string, unknown>;
    return first?.status === 'error';
}

export function resolveTargetImageFromUpload(component: ModuleComponent | undefined): {
    imageUrl?: string;
    imageStorageKey?: string;
    imageError?: boolean;
} {
    const ref = getFileUploadMediaRef(component);
    if (!ref) {
        if (hasUploadError(component)) return { imageError: true };
        return {};
    }
    if (ref.url) {
        const u = ref.url.trim();
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) {
            return { imageUrl: u };
        }
        return { imageUrl: resolveMediaUrl(u) };
    }
    if (ref.s3Key) return { imageStorageKey: ref.s3Key };
    return {};
}

// ---------------------------------------------------------------------------
// Config extraction
// ---------------------------------------------------------------------------

export function parseCriteriaRankingList(components: ModuleComponent[]): IATCriteriaItem[] {
    const criteriaComp = components.find(c => c.id === 'criteria' || c.type === 'ranking-list');
    if (!criteriaComp) return [];

    let items: Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }> | null = null;

    const directVal = criteriaComp.value;
    if (
        directVal &&
        typeof directVal === 'object' &&
        !Array.isArray(directVal) &&
        'items' in directVal &&
        Array.isArray((directVal as { items: unknown }).items)
    ) {
        items = (directVal as { items: Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }> }).items;
    }

    const raw = getComponentText(criteriaComp);
    if (!items && raw) {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                items = parsed;
            } else if (
                parsed &&
                typeof parsed === 'object' &&
                'items' in parsed &&
                Array.isArray((parsed as { items: unknown }).items)
            ) {
                items = (parsed as { items: Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }> }).items;
            }
        } catch { /* ignore */ }
    }

    if (!items && Array.isArray(criteriaComp.settings?.items)) {
        items = criteriaComp.settings.items as Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }>;
    }

    if (!items) return [];

    const result: IATCriteriaItem[] = [];
    items.forEach((item, idx) => {
        // Skip criteria hidden by the researcher
        if ((item as { hidden?: boolean }).hidden) return;
        const label = (item.label || item.value || '').trim();
        if (!label) return;
        const img = item.image as { s3Key?: string; url?: string } | undefined;
        result.push({
            id: item.id || `crit-${idx}`,
            label,
            imageUrl: img?.url?.trim() || undefined,
            imageStorageKey: img?.s3Key || undefined,
            targetId: (item as { targetId?: string }).targetId || undefined,
        });
    });
    return result;
}

export const extractConfig = (module: ModuleConfig): IATExtractedConfig => {
    const components = module.structure?.components || [];
    const moduleName = module.name.toLowerCase();

    let testType: IATExtractedConfig['testType'] = 'attribute_testing';
    if (moduleName.includes('comparing attribute') || moduleName.includes('comparing attr')) {
        testType = 'comparing_attribute';
    } else if (moduleName.includes('objects comparing') || moduleName.includes('object comparing')) {
        testType = 'objects_comparing';
    }

    const primingComp = components.find(c => c.id === 'priming-time');
    const primingTime = parseInt(getComponentText(primingComp) || '400', 10) || 400;

    const targets: IATTarget[] = [];
    const criteria: IATCriteriaItem[] = [];
    let criteriaCategories: IATExtractedConfig['criteriaCategories'];
    let dimensions: IATExtractedConfig['dimensions'];

    if (testType === 'comparing_attribute') {
        // Objects: object-N-name/image (dynamic count)
        for (let i = 1; i <= 20; i++) {
            const nameComp = components.find(c => c.id === `object-${i}-name`);
            if (!nameComp) continue;
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `object-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({ id: `object-${i}`, name: nameVal, ...img });
            }
        }
        // Dimensions → button labels (e.g. Extravagente / Convencional)
        const dim1 = components.find(c => c.id === 'dimension-1');
        const dim2 = components.find(c => c.id === 'dimension-2');
        const d1 = (getComponentText(dim1) || dim1?.placeholder?.text || 'Yes').trim();
        const d2 = (getComponentText(dim2) || dim2?.placeholder?.text || 'No').trim();
        dimensions = { left: d1, right: d2 };
        criteria.push(...parseCriteriaRankingList(components));
    } else if (testType === 'objects_comparing') {
        // Targets: target-N-name/image (dynamic count)
        for (let i = 1; i <= 20; i++) {
            const nameComp = components.find(c => c.id === `target-${i}-name`);
            if (!nameComp) continue;
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `target-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({ id: `target-${i}`, name: nameVal, ...img });
            }
        }
        // Criteria categories → button labels for Step 1 (e.g. RIcoooo / Malooo)
        const c1 = components.find(c => c.id === 'criteria-1');
        const c2 = components.find(c => c.id === 'criteria-2');
        const l1 = (getComponentText(c1) || c1?.placeholder?.text || 'Positive').trim();
        const l2 = (getComponentText(c2) || c2?.placeholder?.text || 'Negative').trim();
        criteriaCategories = { left: l1, right: l2, leftId: 'criteria-1', rightId: 'criteria-2' };
        criteria.push(...parseCriteriaRankingList(components));
    } else {
        // Attribute Testing: target-N-name/image (dynamic count), criteria ranking-list
        for (let i = 1; i <= 20; i++) {
            const nameComp = components.find(c => c.id === `target-${i}-name`);
            if (!nameComp) continue;
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `target-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({ id: `target-${i}`, name: nameVal, ...img });
            }
        }
        criteria.push(...parseCriteriaRankingList(components));
    }

    // Instruction texts — resolve multi-lang if available
    const exerciseComp = components.find(c => c.id === 'exercise-instructions');
    const testComp = components.find(c => c.id === 'test-instructions');
    const rawExercise = resolveMultiLang(getComponentText(exerciseComp), i18n.language);
    const rawTest = resolveMultiLang(getComponentText(testComp), i18n.language);

    const interpolateTargets = (text: string): string =>
        text.replace(/\[\[(Object|Target)\s*(\d+)\]\]/gi, (_match, _label, num) => {
            const idx = parseInt(num, 10) - 1;
            return targets[idx]?.name ?? `Object ${num}`;
        });

    const showResultsComp = components.find(c => c.id === 'show-results');
    const showResults = getComponentText(showResultsComp) === 'true';

    const responseKeysComp = components.find(c => c.id === 'response-keys');
    const responseKeysRaw = getComponentText(responseKeysComp);
    const responseKeys: 'letters' | 'arrows' = responseKeysRaw === 'arrows' ? 'arrows' : 'letters';

    return {
        testType,
        primingTime,
        targets,
        criteria,
        criteriaCategories,
        dimensions,
        exerciseInstructions: interpolateTargets(rawExercise),
        testInstructions: interpolateTargets(rawTest),
        showResults,
        responseKeys,
    };
};
