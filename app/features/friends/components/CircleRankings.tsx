import { useCallback, useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppText, Surface, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { RankingTabs } from '../../../components/ui/RankingTabs';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { rankSync, PeopleList, type CirclePerson } from './CircleWidgets';
import { loadStandings, loadSupport, type Standing, type Support } from '../../social/CircleData';
import { useSocial } from '../../social/SocialProvider';
export const personalBoards = ['Most in sync', 'Most supportive'] as const;
export type PersonalBoard = (typeof personalBoards)[number];

export function PersonalRankings({
  board,
  onChange,
  onPerson,
}: {
  board: PersonalBoard;
  onChange: (b: PersonalBoard) => void;
  onPerson: (p: CirclePerson) => void;
}) {
  const {
    circle,
    circleStatus,
    commentsRevision,
    feed: { rankingsRevision },
  } = useSocial();
  const [support, setSupport] = useState<Support[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, retry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (board !== 'Most supportive') return;
      let active = true;
      setSupport(null);
      setFailed(false);
      loadSupport().then(
        (rows) => {
          if (active) setSupport(rows);
        },
        () => {
          if (active) setFailed(true);
        },
      );
      return () => {
        active = false;
      };
    }, [board, version, circle.people, rankingsRevision, commentsRevision]),
  );
  const totals = new Map((support ?? []).map((s) => [s.member_id, s]));
  const people =
    board === 'Most in sync'
      ? rankSync(circle.people)
      : circle.people
          .filter((p) => totals.has(p.id))
          .sort((a, b) => {
            const x = totals.get(a.id)!;
            const y = totals.get(b.id)!;
            return (
              y.reactions + y.boops + y.comments - x.reactions - x.boops - x.comments ||
              a.name.localeCompare(b.name)
            );
          });
  return (
    <Surface style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">
        Circle rankings
      </AppText>
      <RankingTabs label="Personal rankings" options={personalBoards} selected={board} onSelect={onChange} />
      <AppText role="caption">
        {board === 'Most in sync' ? 'Cycle sync with you' : 'Support your friends gave you · Last 30 days'}
      </AppText>
      {people.length ? (
        <PeopleList
          embedded
          people={people}
          firstRank={1}
          onOpen={onPerson}
          scoreFor={
            board === 'Most supportive'
              ? (p) => {
                  const s = totals.get(p.id)!;
                  return {
                    value: String(s.reactions + s.boops + s.comments),
                    detail: `${s.reactions} reaction${s.reactions === 1 ? '' : 's'} · ${s.comments} comment${s.comments === 1 ? '' : 's'} · ${s.boops} boop${s.boops === 1 ? '' : 's'}`,
                  };
                }
              : undefined
          }
        />
      ) : board === 'Most supportive' && failed ? (
        <>
          <AppText>Support rankings couldn’t load.</AppText>
          <ActionButton outline label="Try again" onPress={() => retry((x) => x + 1)} />
        </>
      ) : (
        <AppText>
          {circleStatus === 'loading' || (board === 'Most supportive' && !support)
            ? 'Loading rankings…'
            : circleStatus === 'error'
              ? 'Your circle couldn’t load. Pull down to retry.'
              : board === 'Most in sync'
                ? 'Friends with a sync score will appear here.'
                : 'No support activity yet.'}
        </AppText>
      )}
    </Surface>
  );
}
const boards = ['Largest Circle', 'Loudest Voices'] as const;
export function CommunityRankings({ onOpen }: { onOpen: (id: string, alias: string) => void }) {
  const {
    circle,
    feed: { rankingsRevision },
  } = useSocial();
  const t = useWidgetTheme();
  const [board, choose] = useState<(typeof boards)[number]>('Largest Circle');
  const metric = board === boards[0] ? 'friends' : 'posts';
  const [entries, setEntries] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [version, retry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(false);
      setLoading(true);
      setEntries([]);
      loadStandings(metric)
        .then(
          (rows) => {
            if (active) setEntries(rows);
          },
          () => {
            if (active) setError(true);
          },
        )
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [metric, version, rankingsRevision, circle.people]),
  );
  return (
    <Surface style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">
        Community rankings
      </AppText>
      <RankingTabs label="Community rankings" options={boards} selected={board} onSelect={choose} />
      <AppText role="caption">
        Top 10 · {metric === 'friends' ? 'Circle size · All time' : 'Posts shared · This month'}
      </AppText>
      {error ? (
        <>
          <AppText>Community rankings couldn’t load.</AppText>
          <ActionButton outline label="Retry rankings" onPress={() => retry((x) => x + 1)} />
        </>
      ) : loading ? (
        <AppText>Loading rankings…</AppText>
      ) : entries.length ? (
        <ScrollView
          key={metric}
          nestedScrollEnabled
          style={{ maxHeight: 176 }}
          keyboardShouldPersistTaps="handled"
        >
          {entries.map((row, i) => (
            <Pressable
              key={row.member_id}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${i + 1}, @${row.alias}, ${row.score} ${metric}. View profile`}
              onPress={() => onOpen(row.member_id, row.alias)}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: 1,
                borderColor: t.colors.border,
                gap: 12,
              }}
            >
              <AppText>{i + 1}</AppText>
              <AppText style={{ flex: 1 }}>@{row.alias.replace(/^@/, '')}</AppText>
              <AppText>{row.score}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <AppText>No ranked members yet.</AppText>
      )}
    </Surface>
  );
}
