import type { StoreTier } from '@xundian/shared';

const tierConfig: Record<StoreTier, { bg: string; text: string }> = {
  A: { bg: 'bg-tier-a/15', text: 'text-tier-a' },
  B: { bg: 'bg-tier-b/15', text: 'text-tier-b' },
  C: { bg: 'bg-tier-c/15', text: 'text-tier-c' },
};

export default function TierBadge({ tier }: { tier: StoreTier }) {
  const config = tierConfig[tier];
  return (
    <span className={`badge-pill ${config.bg} ${config.text}`}>
      {tier}
    </span>
  );
}
