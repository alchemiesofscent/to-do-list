import React from 'react';
import TrackerApp from './TrackerApp.tsx';
import { useRoute, navigate } from './pmo/router.ts';
import { PmoDailyPage } from './pmo/PmoDailyPage.tsx';
import { PmoProjectPage } from './pmo/PmoProjectPage.tsx';

const App: React.FC = () => {
  const route = useRoute();

  if (route.kind === 'pmo-daily') {
    return <PmoDailyPage onNavigate={navigate} />;
  }
  if (route.kind === 'pmo-project') {
    return <PmoProjectPage projectSlug={route.projectSlug} onNavigate={navigate} />;
  }

  return <TrackerApp />;
};

export default App;

