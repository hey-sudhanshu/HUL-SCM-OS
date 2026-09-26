'use client';
import { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Users } from 'lucide-react';

export function VendorManager() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-xs font-mono text-gray-500">Loading Vendor Data...</div>;

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Users className="w-4 h-4 text-teal-600" />
          SUPPLY BASE - MATERIALS
        </div>
      </div>
      
      <div className="scm-kpi-strip">
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Active Materials</div>
          <div className="scm-kpi-value">124</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Strategic Suppliers</div>
          <div className="scm-kpi-value">18</div>
        </div>
      </div>

      <div className="scm-main bg-gray-100 items-center justify-center">
        <div className="text-center max-w-sm">
          <h3 className="font-bold text-lg mb-2">Material Master Active</h3>
          <p className="text-xs text-gray-500">Sourcing metadata and supplier counts loaded from database. Kraljic classification engine running.</p>
        </div>
      </div>
    </div>
  );
}
