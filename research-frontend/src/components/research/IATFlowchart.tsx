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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Test flow</p>
                <Node label="Exercise phase" variant="phase" sub="Practice with targets" />
                <Arrow />
                <Node label={`Show target`} variant="action" sub={targetNames || 'Target 1, Target 2'} />
                <Arrow />
                <BranchRow left={targets[0]?.name || 'Target 1'} right={targets[1]?.name || 'Target 2'} />
                <Arrow />
                <Node label="Test phase" variant="phase" sub={`${criteriaCount} criteria · ${primingTime}ms`} />
                <Arrow />
                <Node label="Priming" variant="action" sub={`Criterion shown for ${primingTime}ms`} />
                <Arrow />
                <Node label="Classify to target" variant="decision" sub="A / L keys" />
                <Arrow />
                <BranchRow left={targets[0]?.name || 'Target 1'} right={targets[1]?.name || 'Target 2'} />
                <Arrow />
                <Node label="Correct / Incorrect" variant="action" sub="Feedback shown" />
                <div className="mt-3 px-2 py-2 rounded bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500">
                        {criteriaCount} criteria assigned to {targets.length} targets.
                        Each criterion appears after a {primingTime}ms priming.
                    </p>
                </div>
            </div>
        );
    }

    if (testType === 'comparing_attribute') {
        const d1 = dimensions?.left || 'Yes';
        const d2 = dimensions?.right || 'No';
        return (
            <div className="space-y-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Test flow</p>
                <Node label="Single phase" variant="phase" sub="Reaction time test" />
                <Arrow />
                <Node label="Show object + criterion" variant="action" sub={`${targets.length} objects · ${criteriaCount} criteria`} />
                <Arrow />
                <Node label="Respond" variant="decision" sub={`${d1} or ${d2}`} />
                <Arrow />
                <BranchRow left={d1} right={d2} />
                <Arrow />
                <Node label="Record RT" variant="action" sub="No correct/incorrect" />
                <div className="mt-3 px-2 py-2 rounded bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500">
                        Each of {targets.length} object{targets.length !== 1 ? 's' : ''} paired with {criteriaCount} criteria.
                        Participant responds {d1}/{d2}. Only reaction time is measured.
                    </p>
                </div>
            </div>
        );
    }

    // Objects Comparing (IAT classic)
    const c1 = criteriaCategories?.left || 'Positive';
    const c2 = criteriaCategories?.right || 'Negative';
    return (
        <div className="space-y-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Test flow</p>
            <Node label="Step 1: Classify criteria" variant="phase" sub={`${criteriaCount} criteria`} />
            <Arrow />
            <BranchRow left={c1} right={c2} />
            <Arrow />
            <Node label="Step 2: Classify targets" variant="phase" sub={`${targets.length} targets`} />
            <Arrow />
            <BranchRow left={targets[0]?.name || 'Target 1'} right={targets[1]?.name || 'Target 2'} />
            <Arrow />
            <Node label="Step 3: Combined" variant="phase" sub="Criteria + Targets" />
            <Arrow />
            <Node label="Mixed classification" variant="decision" sub="A / L keys" />
            <Arrow />
            <Node label="Record RT + accuracy" variant="action" />
            <div className="mt-3 px-2 py-2 rounded bg-gray-50 border border-gray-100">
                <p className="text-[10px] text-gray-500">
                    Classic IAT: 3 steps. {criteriaCount} criteria ({c1}/{c2}), {targets.length} targets.
                    D-score computed from reaction times.
                </p>
            </div>
        </div>
    );
};

export default IATFlowchart;
