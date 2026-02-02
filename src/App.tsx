import React from 'react';
import TrackerApp from './TrackerApp.tsx';
import { useRoute, navigate } from './pmo/router.ts';
import { PmoDailyPage } from './pmo/PmoDailyPage.tsx';
import { PmoProjectPage } from './pmo/PmoProjectPage.tsx';
import { AuthPage } from './auth/AuthPage.tsx';
import { AuthCallbackPage } from './auth/AuthCallbackPage.tsx';
import { useSupabaseSession } from './auth/useSupabaseSession.ts';
import { TodoPage } from './todo/TodoPage.tsx';

const App: React.FC = () => {
  const route = useRoute();
  const { session } = useSupabaseSession();

  const userId = session?.user.id ?? null;

  if (route.kind === 'pmo-daily') {
    return <PmoDailyPage onNavigate={navigate} storageScopeUserId={userId} session={session} />;
  }
  if (route.kind === 'pmo-project') {
    return <PmoProjectPage projectSlug={route.projectSlug} onNavigate={navigate} storageScopeUserId={userId} />;
  }
  if (route.kind === 'todo') {
    return <TodoPage onNavigate={navigate} session={session} storageScopeUserId={userId} />;
  }
  if (route.kind === 'auth') {
    return <AuthPage onNavigate={navigate} session={session} />;
  }
  if (route.kind === 'auth-callback') {
    return <AuthCallbackPage onNavigate={navigate} />;
  }

  return <TrackerApp session={session} storageScopeUserId={userId} onNavigate={navigate} />;
};

export default App;
