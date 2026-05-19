'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  AlertTriangle,
  RefreshCw,
  PlayCircle,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Activity
} from 'lucide-react';

import { v4 as uuidv4 } from 'uuid';

type LogEntry = {
  id: string;
  time: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  detail?: string;
};

export default function TestToolsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Fixed hydration issue
  const [webhookEventId, setWebhookEventId] = useState('');

  useEffect(() => {
    setWebhookEventId(uuidv4());
  }, []);

  const addLog = (
    type: LogEntry['type'],
    message: string,
    detail?: string
  ) => {
    const entry: LogEntry = {
      id: uuidv4(),
      time: new Date().toLocaleTimeString(),
      type,
      message,
      detail,
    };

    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  const refreshEventId = () => {
    const newId = uuidv4();

    setWebhookEventId(newId);

    addLog(
      'info',
      'New event ID generated',
      `New ID: ${newId}`
    );
  };

  const resetQuota = async () => {
    setLoadingAction('quota');

    addLog(
      'info',
      'Sending quota reset webhook...',
      `Event ID: ${webhookEventId}`
    );

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: webhookEventId,
          eventType: 'SUBSCRIPTION_PAYMENT_SUCCESS',
          payload: {
            triggeredAt: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.idempotent) {
          addLog(
            'warning',
            'Already processed',
            `Event ${webhookEventId} already executed`
          );
        } else {
          addLog(
            'success',
            'Quota reset successful',
            `${data.result?.providersReset} providers updated`
          );
        }
      } else {
        addLog('error', 'Webhook failed', data.error);
      }
    } catch (error) {
      addLog('error', 'Network error', String(error));
    }

    setLoadingAction(null);
  };

  const testIdempotency = async () => {
    setLoadingAction('idempotency');

    addLog(
      'info',
      'Testing idempotency...',
      `Using ID: ${webhookEventId}`
    );

    for (let i = 1; i <= 3; i++) {
      try {
        const res = await fetch('/api/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: webhookEventId,
            eventType: 'SUBSCRIPTION_PAYMENT_SUCCESS',
            payload: {
              attempt: i,
            },
          }),
        });

        const data = await res.json();

        if (data.idempotent) {
          addLog(
            'warning',
            `Attempt ${i}`,
            'Duplicate blocked'
          );
        } else {
          addLog(
            'success',
            `Attempt ${i}`,
            'Processed successfully'
          );
        }
      } catch (error) {
        addLog(
          'error',
          `Attempt ${i}`,
          String(error)
        );
      }

      await new Promise(resolve =>
        setTimeout(resolve, 300)
      );
    }

    addLog(
      'info',
      'Test complete',
      'Webhook executed only once'
    );

    setLoadingAction(null);
  };

  const generateLeads = async () => {
    setLoadingAction('leads');

    addLog(
      'info',
      'Generating leads...',
      'Creating 10 concurrent requests'
    );

    try {
      const res = await fetch('/api/test-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'GENERATE_LEADS',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        addLog(
          'success',
          `${data.succeeded}/10 succeeded`,
          `${data.failed} failed`
        );

        data.results.forEach(
          (
            r: any,
            i: number
          ) => {
            if (r.success && r.data?.lead) {
              addLog(
                'info',
                `Lead ${i + 1}`,
                `Assigned: ${r.data.lead.assignments
                  ?.map(
                    (a: any) =>
                      a.provider.name
                  )
                  .join(', ')}`
              );
            } else {
              addLog(
                'warning',
                `Lead ${i + 1}`,
                r.data?.error || 'Failed'
              );
            }
          }
        );
      } else {
        addLog(
          'error',
          'Generation failed',
          data.error
        );
      }
    } catch (error) {
      addLog(
        'error',
        'Network error',
        String(error)
      );
    }

    setLoadingAction(null);
  };

  const getIcon = (
    type: LogEntry['type']
  ) => {
    switch (type) {
      case 'success':
        return (
          <CheckCircle className="w-4 h-4 text-green-500" />
        );

      case 'error':
        return (
          <XCircle className="w-4 h-4 text-red-500" />
        );

      case 'warning':
        return (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        );

      default:
        return (
          <Shield className="w-4 h-4 text-blue-500" />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="bg-white border-b sticky top-0">
        <div className="max-w-5xl mx-auto h-14 flex items-center px-6">

          <Link href="/">
            <ArrowLeft className="w-5 h-5 text-slate-500"/>
          </Link>

          <h1 className="ml-4 font-bold">
            Test Tools
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        <div className="bg-white rounded-xl p-5 mb-6">

          <div className="font-medium mb-3">
            Idempotency Key
          </div>

          <div className="bg-slate-100 p-3 rounded font-mono text-sm break-all">
            {webhookEventId || 'Generating...'}
          </div>

          <button
            onClick={refreshEventId}
            className="mt-3 text-blue-600 flex gap-2 items-center"
          >
            <RefreshCw className="w-4 h-4"/>
            Generate New ID
          </button>

        </div>

        <div className="grid sm:grid-cols-3 gap-4">

          <button
            onClick={resetQuota}
            disabled={loadingAction !== null}
            className="bg-white p-5 rounded-xl border"
          >
            {loadingAction === 'quota'
              ? <Loader2 className="animate-spin"/>
              : <RefreshCw/>
            }

            <p>Reset Quota</p>
          </button>

          <button
            onClick={testIdempotency}
            disabled={loadingAction !== null}
            className="bg-white p-5 rounded-xl border"
          >
            {loadingAction === 'idempotency'
              ? <Loader2 className="animate-spin"/>
              : <Shield/>
            }

            <p>Test Idempotency</p>
          </button>

          <button
            onClick={generateLeads}
            disabled={loadingAction !== null}
            className="bg-white p-5 rounded-xl border"
          >
            {loadingAction === 'leads'
              ? <Loader2 className="animate-spin"/>
              : <PlayCircle/>
            }

            <p>Generate Leads</p>
          </button>

        </div>

        <div className="bg-white rounded-xl mt-6">

          <div className="p-4 border-b font-semibold">
            Activity Logs
          </div>

          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No logs yet
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="p-4 border-b flex gap-3"
              >
                {getIcon(log.type)}

                <div>
                  <div>{log.message}</div>

                  <div className="text-xs text-slate-500">
                    {log.detail}
                  </div>
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}