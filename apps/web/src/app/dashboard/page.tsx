'use client';

import { getUser } from '@/lib/auth';
import ManagerDashboard from '@/components/ManagerDashboard';
import RepDashboard from '@/components/RepDashboard';

export default function DashboardPage() {
  const user = getUser();
  const role = user?.role ?? 'rep';

  if (role === 'rep') {
    return <RepDashboard />;
  }

  return <ManagerDashboard />;
}
