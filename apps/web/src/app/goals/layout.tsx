'use client';

import DashboardShell from '@/components/DashboardShell';

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
