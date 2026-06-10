import { NextResponse } from 'next/server';
import { getSupabaseServer, isSupabaseServerConfigured } from '@/lib/supabase-server';

/**
 * GET /api/execute/db/health
 * Returns the real database connection health status.
 * Pings Supabase with a lightweight query and reports latency.
 */
export async function GET() {
  const inMemoryAvailable = true; // in-memory store is always available

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({
      connected: inMemoryAvailable,
      provider: 'in-memory only',
      supabase: { connected: false, error: 'Not configured (missing SUPABASE_URL or SUPABASE_ANON_KEY)' },
      latency_ms: 0,
    });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({
      connected: inMemoryAvailable,
      provider: 'in-memory only',
      supabase: { connected: false, error: 'Client initialization failed' },
      latency_ms: 0,
    });
  }

  // Ping Supabase with a lightweight query to measure latency
  const start = performance.now();
  try {
    const { error } = await supabase
      .from('orchestration_tasks')
      .select('task_id', { count: 'exact', head: true });

    const latency = Math.round(performance.now() - start);

    if (error) {
      return NextResponse.json({
        connected: inMemoryAvailable,
        provider: 'in-memory + supabase (degraded)',
        supabase: { connected: false, error: error.message },
        latency_ms: latency,
      });
    }

    return NextResponse.json({
      connected: true,
      provider: 'in-memory + supabase',
      supabase: { connected: true },
      latency_ms: latency,
    });
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return NextResponse.json({
      connected: inMemoryAvailable,
      provider: 'in-memory only (supabase unreachable)',
      supabase: { connected: false, error: err instanceof Error ? err.message : 'Unknown error' },
      latency_ms: latency,
    });
  }
}
