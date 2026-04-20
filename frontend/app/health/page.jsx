'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function StatusBadge({ status }) {
  const colors = {
    ok: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    checking: 'bg-gray-500 animate-pulse',
  };
  const labels = {
    ok: 'Operational',
    degraded: 'Degraded',
    down: 'Down',
    checking: 'Checking...',
  };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white ${colors[status]}`}>
      <span className="w-2 h-2 rounded-full bg-white/80" />
      {labels[status]}
    </span>
  );
}

async function checkBackend() {
  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return { status: 'ok', latency, data };
    }
    return { status: 'degraded', latency, data: null };
  } catch {
    return { status: 'down', latency: null, data: null };
  }
}

async function checkDatabase() {
  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const dbOk = data?.database === true || data?.database === 'ok' || data?.status === 'ok';
      return { status: dbOk ? 'ok' : 'degraded', latency };
    }
    return { status: 'down', latency };
  } catch {
    return { status: 'down', latency: null };
  }
}

async function checkRedis() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const redisOk = data?.redis === true || data?.redis === 'ok' || data?.status === 'ok';
      return { status: redisOk ? 'ok' : 'degraded' };
    }
    return { status: 'down' };
  } catch {
    return { status: 'down' };
  }
}

export default function HealthPage() {
  const [checks, setChecks] = useState({
    backend: { status: 'checking', latency: null },
    database: { status: 'checking', latency: null },
    redis: { status: 'checking' },
  });
  const [lastChecked, setLastChecked] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const runChecks = useCallback(async () => {
    setChecks({
      backend: { status: 'checking', latency: null },
      database: { status: 'checking', latency: null },
      redis: { status: 'checking' },
    });

    const [backend, database, redis] = await Promise.all([
      checkBackend(),
      checkDatabase(),
      checkRedis(),
    ]);

    setChecks({ backend, database, redis });
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runChecks, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, runChecks]);

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const anyDown = Object.values(checks).some((c) => c.status === 'down');
  const overallStatus = allOk ? 'ok' : anyDown ? 'down' : 'degraded';

  const overallLabel = {
    ok: 'All Systems Operational',
    degraded: 'Partial Outage',
    down: 'Major Outage',
  };
  const overallColor = {
    ok: 'border-green-500/30 bg-green-500/5',
    degraded: 'border-yellow-500/30 bg-yellow-500/5',
    down: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <div className="min-h-[80vh] flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Overall Status */}
        <div className={`rounded-xl border p-6 text-center ${overallColor[overallStatus]}`}>
          <StatusBadge status={overallStatus} />
          <h1 className="mt-3 text-2xl font-bold">{overallLabel[overallStatus]}</h1>
          {lastChecked && (
            <p className="mt-1 text-sm opacity-60">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Service Checks */}
        <div className="rounded-xl border border-crypto-dark-border bg-crypto-dark-card p-4 space-y-3">
          <ServiceRow
            label="Backend API"
            description="FastAPI application server"
            status={checks.backend.status}
            latency={checks.backend.latency}
          />
          <hr className="border-crypto-dark-border" />
          <ServiceRow
            label="PostgreSQL"
            description="Primary database"
            status={checks.database.status}
            latency={checks.database.latency}
          />
          <hr className="border-crypto-dark-border" />
          <ServiceRow
            label="Redis"
            description="Cache and price feed"
            status={checks.redis.status}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={runChecks}
            className="px-4 py-2 rounded-lg bg-crypto-dark-card border border-crypto-dark-border hover:bg-crypto-dark-border transition-colors"
          >
            Refresh Now
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>
        </div>
      </div>
    </div>
  );
}

function ServiceRow({ label, description, status, latency }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs opacity-50">{description}</div>
      </div>
      <div className="flex items-center gap-3">
        {latency != null && status === 'ok' && (
          <span className="text-xs opacity-40">{latency}ms</span>
        )}
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
