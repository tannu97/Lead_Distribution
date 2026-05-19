'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, RefreshCw, Users, TrendingUp, Shield, Activity, Phone, MapPin, Clock, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Lead = {
  id: number;
  name: string;
  phone: string;
  city: string;
  service: string;
  serviceCode: string;
  description: string;
  assignedAt: string;
  createdAt: string;
};

type Provider = {
  id: number;
  name: string;
  code: string;
  monthlyQuota: number;
  currentMonthLeads: number;
  remainingQuota: number;
  totalLeads: number;
  leads: Lead[];
};

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [newLeadAlert, setNewLeadAlert] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup SSE
  useEffect(() => {
    const es = new EventSource('/api/sse');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setIsConnected(true);
    });

    es.addEventListener('lead_assigned', (e) => {
      const data = JSON.parse(e.data);
      setLiveUpdate(true);
      setNewLeadAlert(`New lead assigned: ${data.lead?.name || 'Customer'} → ${data.lead?.service?.name || 'Service'}`);
      fetchProviders();
      setTimeout(() => { setLiveUpdate(false); setNewLeadAlert(null); }, 4000);
    });

    es.addEventListener('quota_reset', () => {
      setNewLeadAlert('✅ Provider quotas have been reset');
      fetchProviders();
      setTimeout(() => setNewLeadAlert(null), 4000);
    });

    es.onerror = () => setIsConnected(false);
    es.onopen = () => setIsConnected(true);

    fetchProviders();

    return () => es.close();
  }, [fetchProviders]);

  const totalLeads = providers.reduce((s, p) => s + p.currentMonthLeads, 0);
  const avgQuotaUsed = providers.length
    ? Math.round((providers.reduce((s, p) => s + (p.currentMonthLeads / p.monthlyQuota) * 100, 0) / providers.length))
    : 0;

  const quotaColor = (remaining: number, quota: number) => {
    const pct = remaining / quota;
    if (pct > 0.5) return 'bg-green-500';
    if (pct > 0.2) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const serviceColor = (code: string) => {
    if (code === 'SERVICE_1') return 'bg-blue-100 text-blue-700';
    if (code === 'SERVICE_2') return 'bg-purple-100 text-purple-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">Provider Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isConnected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 pulse-dot' : 'bg-slate-400'}`}></span>
              {isConnected ? 'Live' : 'Offline'}
            </div>
            <button onClick={fetchProviders} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Alert Banner */}
      {newLeadAlert && (
        <div className="bg-blue-600 text-white text-sm font-medium px-4 py-2.5 flex items-center justify-center gap-2 animate-slide-in">
          <Activity className="w-4 h-4" />
          {newLeadAlert}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Providers', value: providers.length, icon: Users, color: 'blue', sub: 'Active this month' },
            { label: 'Leads This Month', value: totalLeads, icon: TrendingUp, color: 'green', sub: 'Across all providers' },
            { label: 'Avg Quota Used', value: `${avgQuotaUsed}%`, icon: Shield, color: 'amber', sub: 'Of 10/provider' },
            { label: 'Providers at Limit', value: providers.filter(p => p.remainingQuota === 0).length, icon: Activity, color: 'red', sub: 'Quota exhausted' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white rounded-2xl border p-4 shadow-sm ${liveUpdate ? 'border-blue-200' : 'border-slate-100'} transition-all`}>
              <div className={`flex items-center justify-between mb-3`}>
                <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  stat.color === 'green' ? 'bg-green-50 text-green-600' :
                  stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </div>
        )}

        {/* Providers Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-48 shimmer"></div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {providers.map((provider) => {
              const quotaPct = (provider.currentMonthLeads / provider.monthlyQuota) * 100;
              const isExpanded = expandedProvider === provider.id;

              return (
                <div key={provider.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${liveUpdate ? 'border-blue-200' : 'border-slate-100'}`}>
                  <div className="p-5">
                    {/* Provider Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                            {provider.code}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm leading-tight">{provider.name}</div>
                            <div className="text-xs text-slate-400">{provider.totalLeads} total leads</div>
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        provider.remainingQuota === 0 ? 'bg-red-50 text-red-600' :
                        provider.remainingQuota <= 3 ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {provider.remainingQuota} left
                      </div>
                    </div>

                    {/* Quota Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Monthly Quota</span>
                        <span className="font-semibold text-slate-700">{provider.currentMonthLeads}/{provider.monthlyQuota}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${quotaColor(provider.remainingQuota, provider.monthlyQuota)}`}
                          style={{ width: `${Math.min(100, quotaPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2 text-center mb-3">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-slate-900">{provider.currentMonthLeads}</div>
                        <div className="text-xs text-slate-400">This month</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-slate-900">{provider.remainingQuota}</div>
                        <div className="text-xs text-slate-400">Remaining</div>
                      </div>
                    </div>

                    {/* Toggle leads */}
                    {provider.leads.length > 0 && (
                      <button
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                        className="w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-700 font-medium pt-2 border-t border-slate-100 transition-colors"
                      >
                        <span>{provider.leads.length} lead{provider.leads.length !== 1 ? 's' : ''} assigned</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {provider.leads.length === 0 && (
                      <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">No leads yet</div>
                    )}
                  </div>

                  {/* Expanded leads list */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 max-h-64 overflow-y-auto">
                      {provider.leads.map((lead) => (
                        <div key={lead.id} className="p-3 border-b border-slate-100 last:border-0 hover:bg-slate-100 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="font-semibold text-slate-800 text-xs">{lead.name}</div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${serviceColor(lead.serviceCode)}`}>
                              {lead.service}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(lead.assignedAt), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Allocation Rules Info */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Assignment Rules
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { service: 'Service 1', mandatory: 'Provider 1', pool: 'Providers 2, 3, 4', color: 'blue' },
              { service: 'Service 2', mandatory: 'Provider 5', pool: 'Providers 6, 7, 8', color: 'purple' },
              { service: 'Service 3', mandatory: 'Provider 1 & 4', pool: 'Providers 2, 3, 5, 6, 7, 8', color: 'green' },
            ].map((rule) => (
              <div key={rule.service} className="bg-slate-50 rounded-xl p-4">
                <div className={`text-xs font-bold mb-2 ${rule.color === 'blue' ? 'text-blue-600' : rule.color === 'purple' ? 'text-purple-600' : 'text-green-600'}`}>
                  {rule.service}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span className="text-slate-600"><strong>Mandatory:</strong> {rule.mandatory}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <Activity className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600"><strong>Pool:</strong> {rule.pool}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
