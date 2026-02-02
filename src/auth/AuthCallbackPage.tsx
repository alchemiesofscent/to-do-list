import React, { useEffect, useState } from 'react';

import { popAuthReturnTo } from './returnTo.ts';
import { isSupabaseConfigured, supabase } from '../supabase.ts';

export const AuthCallbackPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Cloud sync is not configured for this build.');
      return;
    }

    let cancelled = false;

    const run = async () => {
      const url = new URL(window.location.href);
      const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
      if (providerError) {
        setError(providerError);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (!sessionData.session) {
        const code = url.searchParams.get('code');
        if (!code) {
          setError('Signed-in session was not established (missing auth code). Check redirect URL configuration and base path casing.');
          return;
        }

        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        if (!exchangeData.session) {
          setError('Signed-in session was not established after code exchange.');
          return;
        }
      }

      const returnTo = popAuthReturnTo('/');
      onNavigate(returnTo);
    };

    run().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Auth callback failed.'));

    return () => {
      cancelled = true;
    };
  }, [onNavigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Cloud sync</div>
        <div className="font-serif text-xl font-bold text-slate-900 dark:text-white">Signing in…</div>
        {!error ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Completing Supabase authentication.</div>
        ) : (
          <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>
        )}
        {error && (
          <button
            type="button"
            onClick={() => onNavigate('/auth')}
            className="mt-2 px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            Back to login
          </button>
        )}
      </div>
    </div>
  );
};
