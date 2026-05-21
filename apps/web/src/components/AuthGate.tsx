'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getUser, isAuthenticated, isManagerRole } from '@/lib/auth';

const managerOnlyRoutes = [
  '/ai-insights',
  '/checklists',
  '/employees',
  '/integrity',
  '/reports',
  '/settings',
  '/shelf-diff',
  '/store-map',
];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }

    const user = getUser();
    const managerOnly = managerOnlyRoutes.some((route) => pathname.startsWith(route));
    if (managerOnly && !isManagerRole(user)) {
      window.location.href = '/dashboard';
      return;
    }

    setAllowed(true);
  }, [pathname]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
