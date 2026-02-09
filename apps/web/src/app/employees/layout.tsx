'use client';

import DashboardShell from '@/components/DashboardShell';

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
