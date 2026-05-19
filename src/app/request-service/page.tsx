'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, User, Phone, MapPin, Briefcase, MessageSquare, Zap } from 'lucide-react';

const SERVICES = [
  { code: 'SERVICE_1', name: 'Service 1' },
  { code: 'SERVICE_2', name: 'Service 2' },
  { code: 'SERVICE_3', name: 'Service 3' },
];

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

interface SuccessData {
  lead: { id: number; name: string; service: { name: string }; assignments: Array<{ provider: { name: string } }> };
  assignedProviders: number;
}

export default function RequestServicePage() {
  const [form, setForm] = useState({ name: '', phone: '', city: '', serviceCode: '', description: '' });
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setError('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setState('error');
        return;
      }

      setSuccessData(data);
      setState('success');
    } catch {
      setError('Network error. Please try again.');
      setState('error');
    }
  };

  const reset = () => {
    setForm({ name: '', phone: '', city: '', serviceCode: '', description: '' });
    setState('idle');
    setError('');
    setSuccessData(null);
  };

  if (state === 'success' && successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-slide-in">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="font-display text-2xl text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Your request has been assigned to {successData.assignedProviders} providers who will contact you shortly.
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Assignment Details</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lead ID</span>
                <span className="font-semibold text-slate-900">#{successData.lead.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-slate-900">{successData.lead.service.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Assigned to</span>
                <span className="font-semibold text-slate-900">{successData.lead.assignments.map(a => a.provider.name).join(', ')}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
              New Request
            </button>
            <Link href="/dashboard" className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-all text-center">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Prowider</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-slate-900 mb-2">Request a Service</h1>
          <p className="text-slate-500 text-sm">Fill in the details below. Your request will be automatically assigned to qualified providers.</p>
        </div>

        {/* Error Banner */}
        {state === 'error' && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-slide-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-800 text-sm">Submission Failed</div>
              <div className="text-red-600 text-sm mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="10-digit mobile number"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                City <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  required
                  placeholder="Your city"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Service */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Service Type <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  name="serviceCode"
                  value={form.serviceCode}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white transition-all text-slate-800"
                >
                  <option value="">Select a service</option>
                  {SERVICES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Describe your service requirement..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Service info box */}
          {form.serviceCode && (
            <div className="mx-6 mb-5 bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs animate-slide-in">
              <span className="font-semibold text-blue-700">Assignment Preview: </span>
              <span className="text-blue-600">
                {form.serviceCode === 'SERVICE_1' && 'Provider 1 (mandatory) + 1 from pool (Providers 2,3,4)'}
                {form.serviceCode === 'SERVICE_2' && 'Provider 5 (mandatory) + 2 from pool (Providers 6,7,8)'}
                {form.serviceCode === 'SERVICE_3' && 'Provider 1 & 4 (mandatory) + 1 from pool (Providers 2,3,5,6,7,8)'}
              </span>
            </div>
          )}

          {/* Submit */}
          <div className="px-6 pb-6">
            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-all"
            >
              {state === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <>Submit Request <ArrowLeft className="w-4 h-4 rotate-180" /></>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              By submitting, you agree that your details will be shared with matched service providers.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
