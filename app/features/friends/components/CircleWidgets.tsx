import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GardenArt } from '../../../components/brand/GardenArt';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export type CirclePerson = { id: string; name: string; alias: string; score: number | null };

export function SyncSpotlight({ person, onOpen }: { person: CirclePerson; onOpen: () => void }) {
  const t = useWidgetTheme();
  if (person.score === null) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View sync leaderboard. Your top match is ${person.name}, ${person.score}% in sync`}
      onPress={onOpen}
    >
      <Surface
        style={{
          minHeight: 142,
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: t.colors.circleCover,
        }}
      >
        {t.illustrated && <GardenArt pair />}
        <View style={{ width: t.illustrated ? '57%' : '100%', gap: 4 }}>
          <AppText
            role="caption"
            style={{ fontFamily: t.type.semibold, letterSpacing: 1.1, color: t.colors.success }}
          >
            MOST IN SYNC
          </AppText>
          <AppText role="heading" style={{ fontFamily: t.type.display, fontSize: 24, lineHeight: 29 }}>
            {person.name} &amp; you
          </AppText>
          <View
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}
          >
            <Ionicons name="pulse" size={16} color={t.colors.success} />
            <AppText style={{ fontFamily: t.type.heading, color: t.colors.success }}>
              {person.score}% in sync
            </AppText>
          </View>
          <AppText role="caption" style={{ color: t.colors.success, fontFamily: t.type.semibold, marginTop: 4 }}>
            View leaderboard →
          </AppText>
        </View>
      </Surface>
    </Pressable>
  );
}

const PEOPLE_ROW_MIN_HEIGHT = 65;

export function PeopleList({
  people,
  onOpen,
  firstRank,
  scoreFor,
  maxVisibleRows,
  embedded = false,
}: {
  people: CirclePerson[];
  onOpen: (p: CirclePerson) => void;
  firstRank?: number;
  maxVisibleRows?: number;
  embedded?: boolean;
  scoreFor?: (p: CirclePerson) => { value: string; detail: string };
}) {
  const t = useWidgetTheme();
  const rows = people.map((p, i) => (
    <Pressable
      key={p.id}
      accessibilityRole="button"
      accessibilityLabel={
        firstRank === undefined
          ? `View ${p.name}'s profile`
          : `Rank ${firstRank + i}, ${p.name}, ${scoreFor ? scoreFor(p).detail : p.score + '% in sync'}. View profile`
      }
      onPress={() => onOpen(p)}
      style={{
        minHeight: PEOPLE_ROW_MIN_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: i ? 1 : 0,
        borderColor: t.colors.border,
        paddingVertical: 8,
      }}
    >
      {firstRank !== undefined && (
        <AppText style={{ fontFamily: t.type.display, color: t.colors.accent, minWidth: 20 }}>
          {firstRank + i}
        </AppText>
      )}
      <View
        style={{
          width: 39,
          height: 39,
          borderRadius: 20,
          backgroundColor: t.colors.guidance,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText style={{ fontFamily: t.type.display, fontSize: 18, color: t.colors.guidanceText }}>
          {p.name.charAt(0)}
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: t.type.heading }}>{p.name}</AppText>
        <AppText role="caption" style={{ color: t.colors.secondary }}>
          {scoreFor ? scoreFor(p).detail : '@' + p.alias}
        </AppText>
      </View>
      {(scoreFor || p.score !== null) && (
        <AppText style={{ fontFamily: t.type.semibold, color: t.colors.success, fontSize: 13 }}>
          {scoreFor ? scoreFor(p).value : p.score + '%'}
        </AppText>
      )}
      <Ionicons name="chevron-forward" size={15} color={t.colors.secondary} />
    </Pressable>
  ));
  const content =
    maxVisibleRows && people.length > maxVisibleRows ? (
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        style={{ maxHeight: maxVisibleRows * PEOPLE_ROW_MIN_HEIGHT }}
      >
        {rows}
      </ScrollView>
    ) : (
      rows
    );
  return embedded ? <View>{content}</View> : <Surface style={{ paddingVertical: 1 }}>{content}</Surface>;
}

export const rankSync = (people: CirclePerson[]) =>
  people
    .filter((p): p is CirclePerson & { score: number } => p.score !== null)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);
