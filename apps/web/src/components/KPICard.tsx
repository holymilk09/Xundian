'use client';

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  delta?: string;
}

export default function KPICard({ label, value, icon, color, delta }: KPICardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-start">
        <div className="text-2xl">{icon}</div>
        {delta && (
          <span
            className="badge-pill text-[11px]"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="text-white text-2xl font-bold mt-3">{value}</div>
      <div className="text-muted text-sm mt-1">{label}</div>
    </div>
  );
}
