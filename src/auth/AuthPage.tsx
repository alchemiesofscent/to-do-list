import React, { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../supabase.ts';

function callbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const baseWithSlash = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${baseWithSlash}auth/callback`;
}

export const AuthPage: React.FC<{
  session: Session | null;
  onNavigate: (path: string) => void;
}> = ({ session, onNavigate }) => {
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const email = session?.user.email ?? null;
  const userId = session?.user.id ?? null;

  const isReady = useMemo(() => Boolean(isSupabaseConfigured && supabase), []);

  const signInWithGithub = async () => {
    setError(null);
    if (!isReady) {
      setError('Cloud sync is not configured for this build.');
      return;
    }
    setIsWorking(true);
    try {
      const { error: signInError } = await supabase!.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: callbackUrl(),
        },
      });
      if (signInError) {
        setError(signInError.message);
        setIsWorking(false);
      }
      // On success, the browser redirects away. Callback route handles navigation.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      setIsWorking(false);
    }
  };

  const signOut = async () => {
    setError(null);
    if (!isReady) {
      setError('Cloud sync is not configured for this build.');
      return;
    }
    setIsWorking(true);
    try {
      const { error: signOutError } = await supabase!.auth.signOut();
      if (signOutError) setError(signOutError.message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-out failed.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Back
          </button>
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Cloud sync</div>
            <div className="font-serif text-lg font-bold text-slate-900 dark:text-white">Supabase Auth</div>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
            Supabase is not configured for this build. Set <span className="font-mono">VITE_SUPABASE_URL</span> and{' '}
            <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to enable cloud sync.
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Status</div>

          {session ? (
            <>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Signed in{email ? <> as <span className="font-mono">{email}</span></> : null}.
              </div>
              {userId && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  User ID: <span className="font-mono break-all">{userId}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={signOut}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-50"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                >
                  Done
                </button>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Note: local data is scoped per account. Signing out switches you back to local-only storage.
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Cloud sync is currently disabled.
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={!isSupabaseConfigured || isWorking}
                  onClick={signInWithGithub}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50"
                >
                  Enable cloud sync (GitHub)
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100"
                >
                  Not now
                </button>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                This app remains fully usable without login; sign in only if you want multi-device sync.
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

