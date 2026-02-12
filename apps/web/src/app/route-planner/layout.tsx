'use client';

import DashboardShell from '@/components/DashboardShell';

export default function RoutePlannerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
