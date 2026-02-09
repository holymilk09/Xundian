'use client';

import DashboardShell from '@/components/DashboardShell';

export default function StoresLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
