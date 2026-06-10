import { NextResponse } from 'next/server';

/**
 * GET /api/system/env-vars
 * Returns status of known environment variables (never exposes full values).
 */
export async function GET() {
  const knownVars = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'AIOS_PROJECT_ROOT',
    'AIOS_DEBUG',
    'NODE_ENV',
  ];

  const envVars: Record<string, { isSet: boolean; preview?: string }> = {};

  for (const varName of knownVars) {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values, show first few chars
      const isSensitive = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('TOKEN');
      envVars[varName] = {
        isSet: true,
        preview: isSensitive
          ? value.slice(0, Math.min(8, value.length)) + '***'
          : value.slice(0, 30),
      };
    } else {
      envVars[varName] = { isSet: false };
    }
  }

  return NextResponse.json({ envVars });
}
