import Link from 'next/link';
import { ArrowRight, Zap, Shield, BarChart3, Users, CheckCircle, Activity } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl text-slate-900">Prowider</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-blue-600 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-all">
              Dashboard
            </Link>
            <Link href="/request-service" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              Request Service <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full pulse-dot"></span>
            Live Lead Distribution System
          </div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 leading-tight mb-6">
            Smart Lead Distribution<br />
            <span className="text-blue-600">Built for Scale</span>
          </h1>
          <p className="text-lg text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Intelligently route customer enquiries to the right service providers using fair round-robin allocation with real-time dashboard updates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/request-service" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5">
              Submit a Service Request <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:-translate-y-0.5">
              <BarChart3 className="w-4 h-4" /> View Dashboard
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16">
          {[
            { label: 'Service Providers', value: '8', icon: Users, color: 'blue' },
            { label: 'Services Available', value: '3', icon: CheckCircle, color: 'green' },
            { label: 'Monthly Quota / Provider', value: '10', icon: Shield, color: 'amber' },
            { label: 'Providers Per Lead', value: '3', icon: Activity, color: 'purple' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                stat.color === 'green' ? 'bg-green-50 text-green-600' :
                stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-purple-50 text-purple-600'
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500">Engineered for correctness, fairness, and reliability</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Customer Submits',
                desc: 'Customer fills the service request form. Duplicate phone + service combinations are blocked at database level.',
                color: 'blue',
              },
              {
                step: '02',
                title: 'Automatic Assignment',
                desc: 'System assigns exactly 3 providers per lead. Mandatory rules first, then fair round-robin rotation from pools.',
                color: 'green',
              },
              {
                step: '03',
                title: 'Real-Time Update',
                desc: 'All provider dashboards instantly update via Server-Sent Events. No page refresh needed.',
                color: 'amber',
              },
            ].map((feature) => (
              <div key={feature.step} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className={`text-xs font-bold tracking-widest mb-4 ${
                  feature.color === 'blue' ? 'text-blue-500' :
                  feature.color === 'green' ? 'text-green-500' : 'text-amber-500'
                }`}>{feature.step}</div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid sm:grid-cols-3 gap-6">
          <Link href="/request-service" className="group bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 hover:-translate-y-1 transition-all">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <ArrowRight className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Request Service</h3>
            <p className="text-blue-100 text-sm">Submit your service enquiry</p>
          </Link>
          <Link href="/dashboard" className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-blue-200 hover:-translate-y-1 transition-all">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg mb-1">Provider Dashboard</h3>
            <p className="text-slate-500 text-sm">Real-time lead monitoring</p>
          </Link>
          <Link href="/test-tools" className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-amber-200 hover:-translate-y-1 transition-all">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg mb-1">Test Tools</h3>
            <p className="text-slate-500 text-sm">Webhook & concurrency testing</p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-400">
          Prowider — Smart Lead Routing & Provider Management
        </div>
      </footer>
    </div>
  );
}
