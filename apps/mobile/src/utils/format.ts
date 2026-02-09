import i18n from '../i18n';

/**
 * Format a date in locale-aware style.
 * zh: 2月9日  /  en: Feb 9
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const lang = i18n.language;

  if (lang === 'zh') {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a full date with year.
 * zh: 2026年2月9日  /  en: Feb 9, 2026
 */
export function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const lang = i18n.language;

  if (lang === 'zh') {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time as HH:MM.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format distance in km with appropriate precision.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format a number with locale grouping (e.g. 2,847 or 2847).
 */
export function formatNumber(n: number): string {
  const lang = i18n.language;
  return n.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
}

/**
 * Format relative days (e.g., "3 days ago" / "3天前").
 */
export function formatDaysAgo(days: number): string {
  const lang = i18n.language;
  if (lang === 'zh') {
    return `${days}天前`;
  }
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
