'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications, refetch } = useApi<Notification[]>('/notifications');

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      refetch();
    } catch {
      // silently fail
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/[0.04] hover:text-white transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <span>{t('notifications')}</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 left-7 w-4 h-4 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden"
          style={{ background: '#1E293B' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-white text-sm font-semibold">{t('notifications')}</span>
            {unreadCount > 0 && (
              <span className="text-xs text-slate-500 bg-white/[0.06] px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {(!notifications || notifications.length === 0) && (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-500 text-sm">{t('noNotifications')}</p>
              </div>
            )}
            {(notifications || []).map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors ${
                  !notif.read ? 'border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm font-medium ${notif.read ? 'text-slate-400' : 'text-white'}`}>
                    {notif.title}
                  </span>
                  <span className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">
                    {timeAgo(notif.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications && notifications.length > 0 && unreadCount > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06]">
              <button
                onClick={handleMarkAllRead}
                className="w-full text-xs text-primary hover:text-primary/80 transition-colors font-medium text-center"
              >
                {t('markAllRead')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
