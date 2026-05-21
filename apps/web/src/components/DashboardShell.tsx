'use client';

import Sidebar from './Sidebar';
import AuthGate from './AuthGate';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-60 p-8">{children}</main>
      </div>
    </AuthGate>
  );
}
