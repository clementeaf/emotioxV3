/**
 * IAT Flowchart
 *
 * Reactive visual diagram of the IAT test flow. Shows phases, targets, criteria,
 * and timing using the researcher's live config. Replaces static notes in the sidebar.
 */

interface Target {
    name: string;
    imageUrl?: string;
}

interface Criterion {
    label: string;
    hidden?: boolean;
    targetId?: string;
}

interface IATFlowchartProps {
    testType: 'attribute_testing' | 'comparing_attribute' | 'objects_comparing';
    targets: Target[];
    criteria: Criterion[];
    primingTime: number;
    dimensions?: { left: string; right: string };
    criteriaCategories?: { left: string; right: string };
}

const Node = ({ label, variant = 'default', sub }: { label: string; variant?: 'default' | 'phase' | 'action' | 'decision'; sub?: string }) => {
    const styles = {
        default: 'bg-white border-gray-200 text-gray-700',
        phase: 'bg-blue-50 border-blue-300 text-blue-800 font-semibold',
        action: 'bg-gray-50 border-gray-300 text-gray-600',
        decision: 'bg-amber-50 border-amber-300 text-amber-800',
    };
    const shape = variant === 'decision' ? 'rotate-0' : '';
    return (
        <div className={`px-3 py-2 rounded-lg border text-xs text-center ${styles[variant]} ${shape}`}>
            <div>{label}</div>
            {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
        </div>
    );
};

const Arrow = () => (
    <div className="flex justify-center py-1">
        <svg width="12" height="16" viewBox="0 0 12 16" className="text-gray-300">
            <path d="M6 0 L6 12 M2 8 L6 14 L10 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    </div>
);

const BranchRow = ({ left, right }: { left: string; right: string }) => (
    <div className="grid grid-cols-2 gap-2">
        <div className="px-2 py-1.5 rounded border border-gray-200 bg-white text-[10px] text-center text-gray-600">{left}</div>
        <div className="px-2 py-1.5 rounded border border-gray-200 bg-white text-[10px] text-center text-gray-600">{right}</div>
    </div>
);

export const IATFlowchart = ({
    testType,
    targets,
    criteria,
    primingTime,
    dimensions,
    criteriaCategories,
}: IATFlowchartProps) => {
    const visible = criteria.filter(c => !c.hidden && c.label.trim());
    const targetNames = targets.map(t => t.name || '?').join(', ');
    const criteriaCount = visible.length;

    if (testType === 'attribute_testing') {
        return (
            <div className="space-y-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Flujo del test</p>
                <Node label="Fase de ejercicio" variant="phase" sub="Práctica con targets" />
                <Arrow />
                <Node label="Mostrar target" variant="action" sub={targetNames || 'Target 1, Target 2'} />
                <Arrow />
                <BranchRow left={targets[0]?.name || 'Target 1'} right={targets[1]?.name || 'Target 2'} />
                <Arrow />
                <Node label="Fase de test" variant="phase" sub={`${criteriaCount} criterios · ${primingTime}ms`} />
                <Arrow />
                <Node label="Priming" variant="action" sub={`Criterio mostrado por ${primingTime}ms`} />
                <Arrow />
                <Node label="Clasificar al target" variant="decision" sub="Teclas A / L" />
                <Arrow />
                <BranchRow left={targets[0]?.name || 'Target 1'} right={targets[1]?.name || 'Target 2'} />
                <Arrow />
                <Node label="Correcto / Incorrecto" variant="action" sub="Se muestra feedback" />
                <div className="mt-3 px-2 py-2 rounded bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500">
                        {criteriaCount} criterios asignados a {targets.length} targets.
                        Cada criterio aparece tras un priming de {primingTime}ms.
                    </p>
                </div>
            </div>
        );
    }

    if (testType === 'comparing_attribute') {
        const d1 = dimensions?.left || 'Sí';
        const d2 = dimensions?.right || 'No';
        return (
            <div className="space-y-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Flujo del test</p>
                <Node label="Fase única" variant="phase" sub="Test de tiempo de reacción" />
                <Arrow />
                <Node label="Mostrar objeto + criterio" variant="action" sub={`${targets.length} objetos · ${criteriaCount} criterios`} />
                <Arrow />
                <Node label="Responder" variant="decision" sub={`${d1} o ${d2}`} />
                <Arrow />
                <BranchRow left={d1} right={d2} />
                <Arrow />
                <Node label="Registrar TR" variant="action" sub="Sin correcto/incorrecto" />
                <div className="mt-3 px-2 py-2 rounded bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500">
                        Cada uno de {targets.length} objeto{targets.length !== 1 ? 's' : ''} emparejado con {criteriaCount} criterios.
                        El participante responde {d1}/{d2}. Solo se mide tiempo de reacción.
                    </p>
                </div>
            </div>
        );
    }

    const c1 = criteriaCategories?.left || 'Positivo';
    const c2 = criteriaCategories?.right || 'Negativo';
    return (
        <div className="space-y-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Flujo del test</p>
            <Node label="Paso 1: Clasificar criterios" variant="phase" sub={`${criteriaCount} criterios`} />
            <Arrow />
            <BranchRow left={c1} right={c2} />
            <Arrow />
            <Node label="Paso 2: Clasificar targets" variant="phase" sub={`${targets.length} targets`} />
            <Arrow />
            <BranchRow left={targets[0]?.name || 'Target 1'} right={targets[1]?.name || 'Target 2'} />
            <Arrow />
            <Node label="Paso 3: Combinado" variant="phase" sub="Criterios + Targets" />
            <Arrow />
            <Node label="Clasificación mixta" variant="decision" sub="Teclas A / L" />
            <Arrow />
            <Node label="Registrar TR + precisión" variant="action" />
            <div className="mt-3 px-2 py-2 rounded bg-gray-50 border border-gray-100">
                <p className="text-[10px] text-gray-500">
                    IAT clásico: 3 pasos. {criteriaCount} criterios ({c1}/{c2}), {targets.length} targets.
                    D-score calculado desde tiempos de reacción.
                </p>
            </div>
        </div>
    );
};

export default IATFlowchart;
