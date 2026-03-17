import { cn } from '../../../../lib/utils';

interface CPVCardProps {
  value: number;
  className?: string;
}

export const CPVCard = ({ value, className }: CPVCardProps) => {
  return (
    <div className={cn(
      'inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm',
      className
    )}>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-white/70 leading-none mb-0.5">CPV</div>
        <div className="text-2xl font-bold leading-none">{value}</div>
      </div>
      <div className="text-[10px] text-white/60 leading-tight max-w-[7rem]">
        Customer Perceived Value
      </div>
    </div>
  );
};
