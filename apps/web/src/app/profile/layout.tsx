'use client';

import DashboardShell from '@/components/DashboardShell';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
