import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { ComponentConfig } from '../types/moduleBuilder.types';
import { isScreenerSingleChoiceSelection } from '../utils/screenerBuilder';

type SetComponents = Dispatch<SetStateAction<ComponentConfig[]>>;
type SetComponentValues = Dispatch<SetStateAction<Record<string, string>>>;

/**
 * When Screener Choice Type is Single Choice, removes extra isChoice components so only one option row remains per groupLabel.
 */
export function useScreenerSingleChoiceTrim(
    moduleName: string | undefined,
    components: ComponentConfig[],
    componentValues: Record<string, string>,
    setComponents: SetComponents,
    setComponentValues: SetComponentValues
): void {
    useEffect(() => {
        if (moduleName?.trim().toLowerCase() !== 'screener') {
            return;
        }
        const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const select = sorted.find((c) => c.type === 'select');
        if (!select) {
            return;
        }
        const raw = componentValues[select.id] ?? '';
        if (!isScreenerSingleChoiceSelection(select, raw)) {
            return;
        }
        const choiceComps = components.filter((c) => c.settings?.isChoice && c.settings?.groupLabel);
        if (choiceComps.length <= 1) {
            return;
        }
        const byGroup = new Map<string, ComponentConfig[]>();
        for (const c of choiceComps) {
            const gl = String(c.settings?.groupLabel ?? '');
            if (!byGroup.has(gl)) {
                byGroup.set(gl, []);
            }
            byGroup.get(gl)!.push(c);
        }
        const toRemove: string[] = [];
        for (const [, group] of byGroup) {
            const ordered = [...group].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            ordered.slice(1).forEach((c) => toRemove.push(c.id));
        }
        if (toRemove.length === 0) {
            return;
        }
        setComponents((prev) => prev.filter((c) => !toRemove.includes(c.id)));
        setComponentValues((prev) => {
            const next = { ...prev };
            for (const id of toRemove) {
                delete next[id];
            }
            return next;
        });
    }, [moduleName, components, componentValues, setComponents, setComponentValues]);
}
