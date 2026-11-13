import { useEffect, useRef, useState } from 'react';
import { RankingVisibilityRow } from './RankingVisibilityRow';
import { TextAction } from '../../../components/ui/ScreenControls';
import { supabase } from '../../../services/supabase/client';

export function RankingVisibility({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, retry] = useState(0);
  const mounted = useRef(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    setFailed(false);
    setEnabled(null);
    async function load() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('community_rankings_enabled')
          .eq('id', userId)
          .single();
        if (error) throw error;
        if (active) setEnabled(data.community_rankings_enabled);
      } catch {
        if (active) setFailed(true);
      }
    }
    void load();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [userId, attempt]);
  async function save(next: boolean) {
    if (enabled === null || lock.current) return;
    lock.current = true;
    setSaving(true);
    setFailed(false);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ community_rankings_enabled: next })
        .eq('id', userId)
        .select('community_rankings_enabled')
        .single();
      if (error) throw error;
      if (mounted.current) setEnabled(data.community_rankings_enabled);
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <>
      <RankingVisibilityRow enabled={enabled === true} busy={saving || enabled === null} onChange={save} />
      {failed && (
        <TextAction label="Couldn’t confirm ranking visibility. Retry" onPress={() => retry((n) => n + 1)} />
      )}
    </>
  );
}
