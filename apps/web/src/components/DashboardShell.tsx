'use client';

import Sidebar from './Sidebar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
