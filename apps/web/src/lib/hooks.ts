'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from './api';

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data.data);
    } catch (err: any) {
      console.error('API request failed:', err.response?.data?.error || err.message);
      setError('Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useExportCSV(endpoint: string, filename: string) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.info(`[AUDIT] Export: ${endpoint} -> ${filename} at ${new Date().toISOString()}`);
    } catch {
      alert(t('operationFailed'));
    } finally {
      setExporting(false);
    }
  }, [endpoint, filename, t]);
  return { exporting, handleExport };
}
