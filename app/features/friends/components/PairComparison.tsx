import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { getCycleDay, type CyclePhase, type CycleSnapshot } from '../../../../packages/domain/cycles/models';
import { DottieSyncScene } from '../../../components/brand/DottieMascot';
import { SyncRings } from '../../../components/brand/CycleRing';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { TextAction } from '../../../components/ui/ScreenControls';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { computeSyncScore, fallbackRecommendations, type SyncScoreSummary } from '../utils/syncScore';
import { FlowGapSparkline, timelineSegments } from './ComparisonCharts';

export type PairComparisonModel = {
  summary: SyncScoreSummary | null;
  yourPhase: CyclePhase;
  theirPhase: CyclePhase;
  yourDay: number | null;
  theirDay: number | null;
  recommendations: string[];
  updatedAt?: string;
};

export function buildPairComparison(
  yours?: CycleSnapshot,
  theirs?: CycleSnapshot,
  guidance?: { recommendations: string[]; generated_at: string } | null,
  now = new Date(),
): PairComparisonModel {
  const yourPhase = yours?.currentPhase ?? 'unknown';
  const theirPhase = theirs?.currentPhase ?? 'unknown';
  const summary = yours && theirs ? computeSyncScore({ selfSnapshot: yours, friendSnapshot: theirs, now }) : null;
  return {
    summary, yourPhase, theirPhase,
    yourDay: getCycleDay(yours, now), theirDay: getCycleDay(theirs, now),
    recommendations: guidance?.recommendations ?? fallbackRecommendations({ selfPhase: yourPhase, friendPhase: theirPhase, score: summary?.score ?? 60 }),
    updatedAt: guidance?.generated_at,
  };
}

const pluralDays = (value: number) => value === 1 ? '1 day' : `${value} days`;
const monthDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
function dateRange(start: string, end: string) {
  const first = monthDay(start);
  const last = monthDay(end);
  return first === last ? first : `${first} – ${last}`;
}
function PhaseRow({ label, phase }: { label: string; phase: CyclePhase }) {
  const t = useWidgetTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText style={{ flexShrink: 1 }}>{label}</AppText>
      <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: t.phase[phase].surface }}>
        <AppText role="caption" style={{ color: t.phase[phase].text, fontFamily: t.type.semibold }}>
          {phase === 'unknown' ? 'No phase shared' : phase[0].toUpperCase() + phase.slice(1)}
        </AppText>
      </View>
    </View>
  );
}

function HistoryRow({ row, name }: { row: SyncScoreSummary['cycleTrend'][number]; name: string }) {
  const t = useWidgetTheme();
  const segments = timelineSegments(row);
  if (!segments) return null;
  const tracks = [
    { name: 'You', start: row.selfStart, end: row.selfEnd, bar: segments.self, color: t.phase.luteal.chart },
    { name, start: row.friendStart, end: row.friendEnd, bar: segments.friend, color: t.phase.follicular.chart },
  ];
  return (
    <View style={{ gap: 7 }}>
      <AppText style={{ fontFamily: t.type.semibold }}>{row.label}</AppText>
      {tracks.map((track, i) => (
        <View key={i} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <AppText role="caption" style={{ flexShrink: 1 }}>{track.name}</AppText>
            <AppText role="caption">{dateRange(track.start, track.end)}</AppText>
          </View>
          <View style={{ height: 6, backgroundColor: t.colors.subtle, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', height: 6, left: `${track.bar.left}%`, width: `${track.bar.width}%`, backgroundColor: track.color }} />
            {segments.overlap && <View style={{ position: 'absolute', height: 6, left: `${segments.overlap.left}%`, width: `${segments.overlap.width}%`, backgroundColor: t.colors.success }} />}
          </View>
        </View>
      ))}
      <AppText role="caption" style={{ color: t.colors.secondary }}>
        {row.daysApart !== null ? `${pluralDays(row.daysApart)} apart · ` : ''}{pluralDays(row.overlapDays)} in common
      </AppText>
    </View>
  );
}

export function PairComparison({ name, model, yourAvatar, theirAvatar }: {
  name: string; model: PairComparisonModel; yourAvatar?: string | null; theirAvatar?: string | null;
}) {
  const t = useWidgetTheme();
  const { summary } = model;
  const history = summary?.cycleTrend;
  const trend = useMemo(() => (history ?? []).map(row => row.daysApart).filter((n): n is number => n !== null).reverse(), [history]);
  return (
    <View style={{ gap: 14 }}>
      <Surface style={{ gap: 14 }}>
        <AppText role="heading" accessibilityRole="header">Your cycles together</AppText>
        {summary ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            {t.illustrated && (
              <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 148, borderRadius: t.radius.control, overflow: 'hidden', backgroundColor: '#F5F3F0' }}>
                <DottieSyncScene width="100%" height={148} color1={t.phase[model.yourPhase].chart} color2={t.phase[model.theirPhase].chart} />
              </View>
            )}
            <SyncRings size={148} syncPercent={summary.score} yourPhase={model.yourPhase} theirPhase={model.theirPhase}
              yourDay={model.yourDay} theirDay={model.theirDay} friendInitial={name.charAt(0).toUpperCase()}
              yourAvatarUrl={yourAvatar} friendAvatarUrl={theirAvatar} />
            <AppText style={{ fontFamily: t.type.semibold }}>In sync</AppText>
            <AppText role="caption" style={{ color: t.colors.secondary }}>
              {summary.confidence[0].toUpperCase() + summary.confidence.slice(1)} confidence
            </AppText>
          </View>
        ) : <AppText>Once you both have cycle data, your sync score will appear here.</AppText>}
        <PhaseRow label="Your phase" phase={model.yourPhase} />
        <PhaseRow label={`${name}’s phase`} phase={model.theirPhase} />
      </Surface>
      {summary && (
        <Surface style={{ gap: 12 }}>
          <AppText role="heading" accessibilityRole="header">Flow timing</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ flex: 1, minWidth: 95 }}>
              <AppText role="caption">Latest start gap</AppText>
              <AppText role="heading">{summary.metrics.daysApart === null ? 'Unknown' : pluralDays(summary.metrics.daysApart)}</AppText>
              {trend.length > 1 && <FlowGapSparkline data={trend} color={t.phase.luteal.text} />}
            </View>
            <View style={{ flex: 1, minWidth: 95 }}>
              <AppText role="caption">Flow overlap</AppText>
              <AppText role="heading">{pluralDays(summary.metrics.overlapDays)}</AppText>
              <AppText role="caption" style={{ color: t.colors.secondary }}>in the last 28 days</AppText>
            </View>
          </View>
        </Surface>
      )}
      <Surface style={{ gap: 14 }}>
        <AppText role="heading" accessibilityRole="header">Cycle history</AppText>
        {history?.length ? history.map(row => <HistoryRow key={row.label} row={row} name={name} />) : <AppText>No shared cycle history yet.</AppText>}
      </Surface>
      <Surface tone="guidance" style={{ gap: 12 }}>
        <AppText role="heading" accessibilityRole="header">Recommendations</AppText>
        {model.recommendations.map((line, index) => <AppText key={index}>{line}</AppText>)}
        <AppText role="caption" style={{ color: t.colors.secondary }}>
          {model.updatedAt ? `Updated ${monthDay(model.updatedAt)}` : 'General suggestions'}
        </AppText>
      </Surface>
    </View>
  );
}

export function PairActions({ name, onBoop, onRemove }: {
  name: string; onBoop: () => Promise<'queued' | 'sent'>; onRemove: () => Promise<void>;
}) {
  const [delivery, setDelivery] = useState<'idle' | 'sending' | 'queued' | 'sent'>('idle');
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const boop = async () => {
    if (lock.current) return;
    lock.current = true;
    setError('');
    setDelivery('sending');
    try { setDelivery(await onBoop()); }
    catch { setDelivery('idle'); setError('Your boop couldn’t be sent. Try again.'); }
    finally { lock.current = false; }
  };
  const remove = async () => {
    if (lock.current) return;
    lock.current = true;
    setRemoving(true);
    setError('');
    try { await onRemove(); }
    catch { setError('Your friend couldn’t be removed. Try again.'); }
    finally { lock.current = false; setRemoving(false); }
  };
  return (
    <View style={{ gap: 6 }}>
      <ActionButton outline label={delivery === 'idle' ? `Boop ${name}` : delivery === 'queued' ? 'Boop queued' : delivery === 'sent' ? 'Booped!' : 'Sending…'}
        disabled={delivery !== 'idle' || removing} onPress={boop} />
      {confirm ? (
        <Surface style={{ gap: 8 }}>
          <AppText role="heading">Remove {name}?</AppText>
          <AppText>You’ll stop sharing updates and cycle comparisons. You can send a new friend request to reconnect.</AppText>
          <ActionButton label={removing ? 'Removing…' : 'Yes, remove friend'} onPress={remove} disabled={removing} />
          <ActionButton outline label="Keep friend" onPress={() => setConfirm(false)} disabled={removing} />
        </Surface>
      ) : <TextAction label="Remove friend" onPress={() => setConfirm(true)} />}
      {!!error && <AppText accessibilityRole="alert">{error}</AppText>}
    </View>
  );
}
