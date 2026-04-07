import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { ComponentConfig } from '../types/moduleBuilder.types';
import { isScreenerMultipleChoiceSelection } from '../utils/screenerBuilder';

type SetComponents = Dispatch<SetStateAction<ComponentConfig[]>>;
type SetComponentValues = Dispatch<SetStateAction<Record<string, string>>>;

const SCREENER_MULTIPLE_DEFAULT_OPTIONS = 3;

/**
 * When Screener Choice Type becomes Multiple Choice, ensures each isChoice group has 3 option components by default.
 */
export function useScreenerMultipleChoiceGroupPad(
    moduleName: string | undefined,
    components: ComponentConfig[],
    componentValues: Record<string, string>,
    setComponents: SetComponents,
    setComponentValues: SetComponentValues
): void {
    const prevMultipleRef = useRef<boolean>(false);

    useEffect(() => {
        if (moduleName?.trim().toLowerCase() !== 'screener') {
            prevMultipleRef.current = false;
            return;
        }
        const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const select = sorted.find((c) => c.type === 'select');
        if (!select) {
            return;
        }
        const raw = componentValues[select.id] ?? '';
        const isMultiple = isScreenerMultipleChoiceSelection(select, raw);
        const becameMultiple = isMultiple && !prevMultipleRef.current;
        prevMultipleRef.current = isMultiple;
        if (!isMultiple || !becameMultiple) {
            return;
        }

        const choiceComps = components.filter((c) => c.settings?.isChoice && c.settings?.groupLabel);
        if (choiceComps.length === 0) {
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

        const newIds: string[] = [];

        setComponents((prev) => {
            const next = [...prev];
            for (const [, group] of byGroup) {
                const ordered = [...group].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                if (ordered.length >= SCREENER_MULTIPLE_DEFAULT_OPTIONS) {
                    continue;
                }
                const last = ordered[ordered.length - 1];
                if (!last) {
                    continue;
                }
                const need = SCREENER_MULTIPLE_DEFAULT_OPTIONS - ordered.length;
                for (let i = 0; i < need; i++) {
                    const newId = `choice-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`;
                    newIds.push(newId);
                    const gl = String(last.settings?.groupLabel ?? '');
                    const newComponent: ComponentConfig = {
                        id: newId,
                        type: 'input',
                        label: '',
                        settings: {
                            ...last.settings,
                            isChoice: true,
                            groupLabel: gl,
                        },
                        placeholder: last.placeholder,
                        order: (last.order ?? 0) + 0.01 * (i + 1),
                    };
                    next.push(newComponent);
                }
            }
            return next;
        });

        if (newIds.length > 0) {
            setComponentValues((prev) => {
                const next = { ...prev };
                for (const id of newIds) {
                    next[id] = '';
                }
                return next;
            });
        }
    }, [moduleName, components, componentValues, setComponents, setComponentValues]);
}
