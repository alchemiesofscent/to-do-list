import { useEffect, useState } from 'react';

type Route =
  | { kind: 'tracker' }
  | { kind: 'pmo-daily' }
  | { kind: 'pmo-project'; projectSlug: string };

function baseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function stripBase(pathname: string): string {
  const base = baseUrl();
  if (base === '/') return pathname;
  const normalised = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const baseNoTrailing = base.endsWith('/') ? base.slice(0, -1) : base;
  if (normalised === baseNoTrailing) return '/';
  if (normalised.startsWith(baseNoTrailing + '/')) return normalised.slice(baseNoTrailing.length);
  return normalised;
}

function parseRoute(pathname: string): Route {
  const rel = stripBase(pathname);
  if (rel === '/pmo' || rel === '/pmo/' || rel === '/pmo/daily' || rel === '/pmo/daily/') return { kind: 'pmo-daily' };
  const project = rel.match(/^\/pmo\/project\/([^/]+)\/?$/);
  if (project) return { kind: 'pmo-project', projectSlug: decodeURIComponent(project[1] ?? '') };
  return { kind: 'tracker' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return route;
}

export function navigate(path: string): void {
  const base = baseUrl().replace(/\/$/, '');
  const next = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${next}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

