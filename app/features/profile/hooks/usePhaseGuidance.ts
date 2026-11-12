import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ensureCycleGuidance, refreshCycleGuidance, type CycleGuidanceRow } from '../../../services/supabase/cycleGuidance';

type State = {
  key: string;
  guidance: CycleGuidanceRow | null;
  status: 'idle' | 'loading' | 'error';
  message: string | null;
};

export const usePhaseGuidance = (userId: string | undefined, phase: string, phaseStart: string | null) => {
  const key = JSON.stringify([userId, phase, phaseStart]);
  const [state, setState] = useState<State | null>(null);
  const scope = useRef<{ key: string; active: boolean; busy: boolean } | null>(null);
  const available = Boolean(userId && phase !== 'unknown');

  useFocusEffect(useCallback(() => {
    const current = { key, active: true, busy: available };
    scope.current = current;
    if (!available) {
      setState(null);
    } else {
      setState((previous) => ({ key, guidance: previous?.key === key ? previous.guidance : null, status: 'loading', message: null }));
      ensureCycleGuidance(userId!, phase, phaseStart)
        .then((guidance) => {
          if (scope.current !== current || !current.active) return;
          current.busy = false;
          setState({ key, guidance, status: 'idle', message: null });
        })
        .catch(() => {
          if (scope.current !== current || !current.active) return;
          current.busy = false;
          setState((previous) => ({ key, guidance: previous?.key === key ? previous.guidance : null, status: 'error', message: null }));
        });
    }
    return () => { current.active = false; };
  }, [key, available, userId, phase, phaseStart]));

  const refresh = useCallback(async () => {
    const current = scope.current;
    if (!available || !current?.active || current.key !== key || current.busy) return;
    current.busy = true; // Guards double taps before the next render.
    setState((previous) => ({ key, guidance: previous?.key === key ? previous.guidance : null, status: 'loading', message: null }));
    try {
      const result = await refreshCycleGuidance(userId!, phase, phaseStart);
      if (scope.current !== current || !current.active) return;
      setState((previous) => ({
        key,
        guidance: result.guidance ?? (previous?.key === key ? previous.guidance : null),
        status: 'idle',
        message: result.refreshLimited
          ? 'Please wait a couple of minutes before refreshing again.'
          : result.pending
            ? 'Your tips are being prepared. Try refreshing again shortly.'
            : 'Tips refreshed.',
      }));
    } catch {
      if (scope.current !== current || !current.active) return;
      setState((previous) => ({
        key, guidance: previous?.key === key ? previous.guidance : null,
        status: 'error', message: 'Couldn’t refresh tips. Your current ideas are still here. Please try again.',
      }));
    } finally {
      current.busy = false;
    }
  }, [available, key, userId, phase, phaseStart]);

  const visible = state?.key === key ? state : null;
  return {
    guidance: visible?.guidance ?? null,
    status: visible?.status ?? 'idle',
    message: available ? visible?.message ?? null : 'Sync your cycle to refresh AI tips.',
    canRefresh: available,
    refresh,
  };
};
