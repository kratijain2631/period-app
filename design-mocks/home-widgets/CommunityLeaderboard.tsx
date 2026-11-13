import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { AppText, Surface } from '../../app/components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../app/theme/widgetTheme';
import type { CirclePerson } from '../../app/features/friends/components/CircleWidgets';
import { RankingTabs } from '../../app/components/ui/RankingTabs';
import { communityExamples } from './fixtures';

const boards = ['Largest Circle', 'Loudest Voices'] as const;
const TOP_COUNT = 10;
const ROW_HEIGHT = 44;
export function CommunityLeaderboard({
  onPerson,
  members,
}: {
  onPerson: (p: CirclePerson) => void;
  members: typeof communityExamples;
}) {
  const [board, setBoard] = useState<(typeof boards)[number]>('Largest Circle');
  const metric = board === 'Largest Circle' ? 'friends' : 'posts';
  const t = useWidgetTheme();
  const entries = [...members]
    .sort((a, b) => b[metric] - a[metric] || a.person.alias.localeCompare(b.person.alias))
    .slice(0, TOP_COUNT);
  return (
    <Surface style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">
        Community rankings
      </AppText>
      <RankingTabs label="Community rankings" options={boards} selected={board} onSelect={setBoard} />
      <AppText role="caption" style={{ color: t.colors.secondary }}>
        Top {entries.length} · {metric === 'friends' ? 'Circle size · All time' : 'Posts shared · This month'}
      </AppText>
      <ScrollView
        key={metric}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        style={{ maxHeight: 4 * ROW_HEIGHT }}
      >
        {entries.map(({ person, ...scores }, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rank ${i + 1}, @${person.alias}, ${scores[metric]} ${metric}. View profile`}
            key={person.id}
            onPress={() => onPerson(person)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: ROW_HEIGHT,
              borderTopWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <AppText
              role="caption"
              style={{ fontFamily: t.type.heading, color: t.colors.secondary, minWidth: 15 }}
            >
              {i + 1}
            </AppText>
            <AppText style={{ flex: 1, fontFamily: t.type.semibold }}>@{person.alias}</AppText>
            <AppText style={{ fontFamily: t.type.heading }}>{scores[metric]}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Surface>
  );
}
