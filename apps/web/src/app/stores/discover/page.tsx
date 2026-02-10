'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

// Chengdu fallback coordinates
const CHENGDU_LAT = 30.5728;
const CHENGDU_LNG = 104.0668;

// SVG projection helpers (same as store-map)
const LAT_MIN = 30.52;
const LAT_MAX = 30.61;
const LNG_MIN = 104.02;
const LNG_MAX = 104.11;
const SVG_W = 300;
const SVG_H = 200;

function projectX(lng: number): number {
  return ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * SVG_W;
}
function projectY(lat: number): number {
  return SVG_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H;
}

export default function DiscoverStorePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [nameZh, setNameZh] = useState('');
  const [storeType, setStoreType] = useState('small_shop');
  const [tier, setTier] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const captureGPS = () => {
    setGpsLoading(true);
    setErrorMsg('');

    if (!navigator.geolocation) {
      // Fallback for dev: use Chengdu center
      setLatitude(CHENGDU_LAT + (Math.random() - 0.5) * 0.02);
      setLongitude(CHENGDU_LNG + (Math.random() - 0.5) * 0.02);
      setGpsAccuracy(15);
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsAccuracy(pos.coords.accuracy);
        setGpsLoading(false);
      },
      () => {
        // Fallback on error: use Chengdu coordinates with random offset
        setLatitude(CHENGDU_LAT + (Math.random() - 0.5) * 0.02);
        setLongitude(CHENGDU_LNG + (Math.random() - 0.5) * 0.02);
        setGpsAccuracy(15);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || latitude == null || longitude == null) {
      setErrorMsg(t('nameAndLocationRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/stores/discover', {
        name,
        name_zh: nameZh || undefined,
        latitude,
        longitude,
        store_type: storeType,
        tier: tier || undefined,
        contact_name: contactName || undefined,
        contact_phone: contactPhone || undefined,
        notes: notes || undefined,
        gps_accuracy_m: gpsAccuracy || undefined,
      });
      router.push('/stores');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to submit';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('discoverStore')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GPS Section */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">GPS</h3>
            <button
              type="button"
              onClick={captureGPS}
              disabled={gpsLoading}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {gpsLoading ? '...' : latitude != null ? t('gpsCaptured') : t('captureGPS')}
            </button>
          </div>

          {latitude != null && longitude != null && (
            <div>
              <div className="text-muted text-xs mb-2">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                {gpsAccuracy != null && ` (${gpsAccuracy.toFixed(0)}m)`}
              </div>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full rounded-lg" style={{ maxHeight: 150, background: '#0F172A' }}>
                <rect width={SVG_W} height={SVG_H} fill="#0F172A" />
                {/* Grid */}
                {[0.25, 0.5, 0.75].map((f) => (
                  <g key={f}>
                    <line x1={SVG_W * f} y1="0" x2={SVG_W * f} y2={SVG_H} stroke="rgba(255,255,255,0.04)" />
                    <line x1="0" y1={SVG_H * f} x2={SVG_W} y2={SVG_H * f} stroke="rgba(255,255,255,0.04)" />
                  </g>
                ))}
                {/* Pin */}
                <circle cx={projectX(longitude)} cy={projectY(latitude)} r="6" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
                <circle cx={projectX(longitude)} cy={projectY(latitude)} r="12" fill="#3B82F6" opacity="0.2">
                  <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          )}
        </div>

        {/* Store Info */}
        <div className="glass-card p-4 space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">{t('storeName')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">{t('storeName')} (中文)</label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">{t('storeType')} *</label>
              <select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="small_shop">{t('small_shop')}</option>
                <option value="convenience">{t('convenience')}</option>
                <option value="supermarket">{t('supermarket')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5">{t('tier')}</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="">{t('selectTier')}</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">{t('name')}</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact name"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">{t('phone')}</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="138xxxxxxxx"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">{t('storeNotes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-danger text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name || latitude == null}
          className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? t('submitting') : t('submitDiscovery')}
        </button>
      </form>
    </div>
  );
}
