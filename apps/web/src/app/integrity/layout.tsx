'use client';

import DashboardShell from '@/components/DashboardShell';

export default function IntegrityLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
