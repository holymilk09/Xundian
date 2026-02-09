'use client';

import { useTranslation } from 'react-i18next';
import StoreTable from '@/components/StoreTable';
import type { StoreTier, StoreType } from '@xundian/shared';

const mockStores: Array<{
  id: string;
  name: string;
  name_zh: string;
  tier: StoreTier;
  store_type: StoreType;
  status: string;
  lastVisit: string | null;
  sos: number;
}> = [
  { id: '1', name: 'Yonghui Supermarket', name_zh: '永辉超市', tier: 'A', store_type: 'supermarket', status: 'visited', lastVisit: '2 days ago', sos: 34 },
  { id: '2', name: 'FamilyMart #2891', name_zh: '全家便利店#2891', tier: 'B', store_type: 'convenience', status: 'pending', lastVisit: '8 days ago', sos: 22 },
  { id: '3', name: "Uncle Wang's Shop", name_zh: '老王小卖部', tier: 'C', store_type: 'small_shop', status: 'overdue', lastVisit: '25 days ago', sos: 0 },
  { id: '4', name: 'Carrefour Central', name_zh: '家乐福中心店', tier: 'A', store_type: 'supermarket', status: 'pending', lastVisit: '3 days ago', sos: 41 },
  { id: '5', name: 'Lawson Nanjing Rd', name_zh: '罗森南京路店', tier: 'B', store_type: 'convenience', status: 'visited', lastVisit: '1 day ago', sos: 28 },
  { id: '6', name: 'Auntie Li Grocery', name_zh: '李阿姨杂货店', tier: 'C', store_type: 'small_shop', status: 'discovered', lastVisit: null, sos: 0 },
];

export default function StoresPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('stores')}</h1>
      <StoreTable stores={mockStores} />
    </div>
  );
}
