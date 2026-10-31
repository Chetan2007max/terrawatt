import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface TerraWattUrlState {
  node: string;
  horizon: number;
  date: string;
  mode: 'reconciled' | 'unreconciled';
  tab?: string;
}

const DEFAULTS: TerraWattUrlState = {
  node: 'India',
  horizon: 14,
  date: '2026-09-12',
  mode: 'reconciled',
};

export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: TerraWattUrlState = useMemo(() => {
    return {
      node: searchParams.get('node') || DEFAULTS.node,
      horizon: parseInt(searchParams.get('horizon') || String(DEFAULTS.horizon), 10),
      date: searchParams.get('date') || DEFAULTS.date,
      mode: (searchParams.get('mode') as 'reconciled' | 'unreconciled') || DEFAULTS.mode,
      tab: searchParams.get('tab') || undefined,
    };
  }, [searchParams]);

  const updateUrlState = useCallback(
    (updates: Partial<TerraWattUrlState>, replace: boolean = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, val]) => {
            if (val === undefined || val === null) {
              next.delete(key);
            } else {
              next.set(key, String(val));
            }
          });
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  return { state, updateUrlState };
}

