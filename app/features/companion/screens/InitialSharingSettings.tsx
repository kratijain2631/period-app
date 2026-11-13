import { useEffect, useRef, useState } from 'react';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { resolveAutoPostSettings } from '../../../services/healthkit/autoPostSettings';
import { supabase } from '../../../services/supabase/client';
import { useSessionStore } from '../../../state/sessionStore';
import { SharingPreferences } from '../../profile/components/SharingPreferences';

export function InitialSharingSettings({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [ranked, setRanked] = useState(false);
  const [posts, setPosts] = useState(useSessionStore.getState().autoPostSettings);
  const [status, setStatus] = useState<'loading' | 'unavailable' | 'ready' | 'saving' | 'error'>('loading');
  const [attempt, retry] = useState(0);
  const saving = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    let current = true;
    mounted.current = true;
    setStatus('loading');
    async function load() {
      try {
        const { data, error } = await supabase.from('users')
          .select('community_rankings_enabled, auto_post_period_days, auto_post_period_start_only, auto_post_phase_transitions')
          .eq('id', userId).single();
        if (error || !data) throw error;
        if (current) {
          setRanked(data.community_rankings_enabled);
          setPosts(resolveAutoPostSettings(data));
          setStatus('ready');
        }
      } catch {
        if (current) setStatus('unavailable');
      }
    }
    void load();
    return () => { current = false; mounted.current = false; };
  }, [attempt, userId]);

  async function save() {
    if (saving.current) return;
    saving.current = true;
    setStatus('saving');
    const current = () => mounted.current && useSessionStore.getState().session?.userId === userId;
    try {
      const { error } = await supabase.from('users').update({
        community_rankings_enabled: ranked,
        auto_post_period_days: posts.postPeriodDays,
        auto_post_period_start_only: posts.postOnlyPeriodStart,
        auto_post_phase_transitions: posts.postPhaseTransitions,
      }).eq('id', userId).select('id').single();
      if (error) throw error;
      if (current()) {
        useSessionStore.getState().setAutoPostSettings(posts);
        onSaved();
      }
    } catch {
      if (current()) setStatus('error');
    } finally {
      saving.current = false;
    }
  }

  if (status === 'loading') return <AppText>Loading your sharing preferences…</AppText>;
  if (status === 'unavailable') return (
    <>
      <AppText accessibilityRole="alert">Couldn’t load your sharing preferences.</AppText>
      <ActionButton label="Try again" onPress={() => retry(n => n + 1)} />
    </>
  );
  return <SharingPreferences ranked={ranked} onRanked={setRanked} posts={posts} onPosts={setPosts}
    busy={status === 'saving'} message={status === 'error' ? 'Couldn’t save your choices. Try again.' : undefined}
    onContinue={save} />;
}
