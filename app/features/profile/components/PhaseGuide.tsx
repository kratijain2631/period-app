import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { splitGuidanceTip } from '../../../../packages/domain/cycles/guidance';
import { brand, brandType } from '../../../theme/brand';

type Props = {
  dos: string[];
  donts: string[];
  personalized: boolean;
  phaseLabel: string | null;
};

export const PhaseGuide = ({ dos, donts, personalized, phaseLabel }: Props) => (
  <View style={styles.section}>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>Phase Guide</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{phaseLabel ?? 'Everyday'}</Text>
      </View>
    </View>
    <Text style={styles.subtitle}>
      {personalized ? 'Ideas for your estimated phase.' : 'A few ideas to start with.'}
      {' '}Follow how you feel.
    </Text>
    {([
      { label: 'Dos', note: 'Make room for', tips: dos, icon: 'add' as const, tone: '#3F6B55', fill: '#EDF5F0' },
      { label: 'Don’ts', note: 'Go easy on', tips: donts, icon: 'remove' as const, tone: '#994B35', fill: '#FFF0EB' },
    ]).map((group) => (
      <View key={group.label} style={styles.group}>
        <View style={styles.groupHeading}>
          <Text accessibilityRole="header" style={[styles.groupLabel, { color: group.tone }]}>{group.label}</Text>
          <Text style={styles.groupNote}>{group.note}</Text>
        </View>
        <View style={styles.cards}>
          {group.tips.map((tip, index) => {
            const { title, body } = splitGuidanceTip(tip);
            return (
              <View key={`${index}-${tip}`} accessible style={styles.card}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[styles.icon, { backgroundColor: group.fill }]}>
                  <Ionicons name={group.icon} size={18} color={group.tone} accessible={false} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  {body ? <Text style={styles.body}>{body}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  title: { fontSize: 28, color: brand.colors.primaryText, ...brandType.display },
  badge: { borderRadius: 99, backgroundColor: brand.colors.mutedFill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, color: '#5A564F', ...brandType.semibold },
  subtitle: { fontSize: 13, lineHeight: 20, color: '#6F6961', marginBottom: 18, ...brandType.body },
  group: { marginBottom: 14 },
  groupHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  groupLabel: { fontSize: 13, ...brandType.semibold },
  groupNote: { fontSize: 12, color: '#6F6961', ...brandType.body },
  cards: { borderRadius: 22, borderWidth: 1, borderColor: brand.colors.separator, backgroundColor: brand.colors.card, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  icon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, lineHeight: 21, color: brand.colors.primaryText, ...brandType.semibold },
  body: { marginTop: 3, fontSize: 13, lineHeight: 20, color: '#5A564F', ...brandType.body },
});
