import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import type { EngagementMember, ReadEngagement } from '../../../services/supabase/engagement';

export function EngagementSheet({ interaction, read, onClose, onMember, self }: {
  interaction: string | null; read: ReadEngagement; onClose: () => void;
  self: string; onMember: (id: string) => void;
}) {
  const t = useWidgetTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<EngagementMember[]>([]);
  const [page, setPage] = useState({ offset: 0, attempt: 0 });
  const [status, setStatus] = useState<'loading' | 'more' | 'done' | 'error'>('loading');
  const reader = useRef(read);
  reader.current = read;
  useEffect(() => {
    let active = true;
    setStatus('loading');
    reader.current(interaction, page.offset).then(next => {
      if (!active) return;
      setRows(prev => [...new Map([...(page.offset ? prev : []), ...next].map(row => [row.member_id, row])).values()]);
      setStatus(next.length === 40 ? 'more' : 'done');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [interaction, page]);
  const title = interaction === 'boop' ? 'Who booped' : interaction ? interaction + ' reactions' : 'Reactions and boops';
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss list" onPress={onClose} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ backgroundColor: t.colors.surface, borderTopLeftRadius: t.radius.card,
          borderTopRightRadius: t.radius.card, padding: 22, paddingBottom: Math.max(22, insets.bottom), maxHeight: '75%', gap: 12 }}>
          <AppText role="heading" accessibilityRole="header">{title}</AppText>
          <ScrollView keyboardShouldPersistTaps="handled">
            {rows.map(row => (
              <Pressable key={row.member_id} onPress={() => { onClose(); onMember(row.member_id); }} accessibilityRole="button"
                style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: t.colors.border }}>
                <View style={{ flex: 1, paddingVertical: 8 }}>
                  <AppText style={{ fontFamily: t.type.semibold }}>{row.member_id === self ? 'You' : row.display_name || row.alias || 'Member'}</AppText>
                  {row.alias && row.alias !== row.display_name && (
                    <AppText role="caption" style={{ color: t.colors.secondary }}>@{row.alias}</AppText>
                  )}
                </View>
                <AppText>{[...row.emojis, ...(row.booped ? ['Boop'] : [])].join('  ')}</AppText>
              </Pressable>
            ))}
            {status === 'loading' && <AppText accessibilityLiveRegion="polite">Loading…</AppText>}
            {status === 'done' && !rows.length && <AppText>{interaction === 'boop' ? 'No boops yet.' : 'No reactions yet.'}</AppText>}
            {status === 'error' && <ActionButton outline label="Couldn’t load people. Retry" onPress={() => setPage({ ...page, attempt: page.attempt + 1 })} />}
            {status === 'more' && <ActionButton outline label="Show more" onPress={() => setPage({ offset: page.offset + 40, attempt: 0 })} />}
          </ScrollView>
          <ActionButton outline label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
