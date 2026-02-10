'use client';

import DashboardShell from '@/components/DashboardShell';

export default function StoreMapLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
