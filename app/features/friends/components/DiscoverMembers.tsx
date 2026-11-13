import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { AppText, Surface, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { TextAction } from '../../../components/ui/ScreenControls';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { useContactDiscovery } from '../hooks/useContactDiscovery';
import { hashContactEmail } from '../../../services/contacts/contactDiscovery';
import { normalizeContactPhone } from '../../../services/contacts/phone';
import { sha256 } from 'js-sha256';
import { supabase } from '../../../services/supabase/client';
import { sendFriendRequestByEmail } from '../../../services/supabase/friendRequests';
import { useSocial } from '../../social/SocialProvider';
type Match = { id: string; alias?: string | null; full_name?: string | null };
export function DiscoverMembers({
  open,
  send,
  respond,
  busy,
}: {
  open: (id: string, alias: string) => void;
  send: (ids: string[]) => Promise<string[]>;
  respond: (id: string, accept: boolean) => void;
  busy: boolean;
}) {
  const t = useWidgetTheme();
  const { id, circle, notifications } = useSocial();
  const focused = useIsFocused();
  const c = useContactDiscovery(id, focused);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Match[]>([]);
  const [notice, setNotice] = useState('');
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState('');
  const [chosen, select] = useState<string[]>([]);
  const term = query.trim();
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(term);
  const phone = /^[+\d][\d\s().-]+$/.test(term);
  const region = Intl.DateTimeFormat()
    .resolvedOptions()
    .locale.match(/[-_]([A-Z]{2})(?:-|$)/)?.[1];
  const friends = new Set(circle.people.map((p) => p.id));
  const pending = new Set(circle.outgoing.map(r => r.memberId));
  const inbound = new Map(notifications.friendRequests.map((r) => [r.from_user_id, r.id]));
  const eligible = (key: string) => !friends.has(key) && !pending.has(key) && !inbound.has(key);
  const selection = chosen.filter((key) => eligible(key) && c.contactMatches.some((p) => p.id === key));
  // Search aliases as you type. Exact identifier searches run only on explicit submission.
  const sequence = useRef(0);
  const lookup = async (q: string, token: number) => {
    setChecking(true);
    try {
      let rows: Match[];
      if (email || phone) {
        const ident = email ? hashContactEmail(q) : normalizeContactPhone(q, region);
        if (!ident) throw Error('Enter the full phone number, including its country code.');
        const { data, error } = await supabase.rpc('contact_friend_matches_v2', {
          identifiers: [email ? ident : sha256(ident)],
        });
        if (error) throw error;
        rows = data ?? [];
      } else {
        const { data, error } = await supabase.rpc('circle_search_members', { term: q.replace(/^@/, '') });
        if (error) throw error;
        rows = data ?? [];
      }
      if (token === sequence.current) {
        setFound(rows);
        setNotice(rows.length ? '' : 'No matching people.');
      }
    } catch (e) {
      if (token === sequence.current)
        setNotice(
          e instanceof Error && e.message.startsWith('Enter the full')
            ? e.message
            : 'Search couldn’t finish. Try again.',
        );
    } finally {
      if (token === sequence.current) setChecking(false);
    }
  };
  useEffect(() => {
    const token = ++sequence.current;
    setFound([]);
    setNotice('');
    setChecking(false);
    if (!focused || term.length < 2 || email || phone || (term.includes('@') && !term.startsWith('@'))) return;
    const timer = setTimeout(() => void lookup(term, token), 300);
    return () => {
      clearTimeout(timer);
      sequence.current++;
    };
  }, [term, focused, email, phone]);
  const input = {
    minHeight: 46,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.control,
    paddingHorizontal: 12,
    color: t.colors.text,
  };
  const incomingActions = (key: string) => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <ActionButton label="Accept" disabled={busy} onPress={() => respond(inbound.get(key)!, true)} />
      <ActionButton outline label="Decline" disabled={busy} onPress={() => respond(inbound.get(key)!, false)} />
    </View>
  );
  const matches = c.contactMatches.filter(
    (p) =>
      !friends.has(p.id) &&
      (p.contactName + ' ' + (p.alias || '')).toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <Surface style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">
        Discover friends
      </AppText>
      <TextInput
        accessibilityLabel="Name, alias, email or phone"
        placeholder="Name, alias, email or phone"
        style={input}
        autoCapitalize="none"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
      />
      {(email || phone) && (
        <ActionButton
          outline
          label="Find match"
          disabled={checking}
          onPress={() => void lookup(term, ++sequence.current)}
        />
      )}
      {checking && <AppText>Searching…</AppText>}
      {notice && <AppText accessibilityLiveRegion="polite">{notice}</AppText>}
      {found.map((p) => (
        <View key={p.id}>
          <TextAction label={p.full_name || p.alias || 'Member'} onPress={() => open(p.id, p.alias || '')} />
          {inbound.has(p.id)
            ? incomingActions(p.id)
            : !friends.has(p.id) && (
                <ActionButton
                  label={pending.has(p.id) ? 'Request pending' : 'Send friend request'}
                  disabled={busy || pending.has(p.id)}
                  onPress={() => void send([p.id])}
                />
              )}
        </View>
      ))}
      {email && !found.length && (
        <TextAction
          label="Send a private request by email"
          onPress={async () => {
            try {
              await sendFriendRequestByEmail(term);
              setNotice('If this email belongs to an eligible account, a request will be sent.');
            } catch {
              setNotice('Couldn’t send a request. Try again.');
            }
          }}
        />
      )}
      <ActionButton
        outline
        label={
          c.contactPermission === 'denied'
            ? 'Open contact settings'
            : c.isFindingContacts
              ? 'Finding contacts…'
              : c.isContactLookupOpen
                ? 'Hide contact matches'
                : 'Find from contacts'
        }
        disabled={c.isFindingContacts}
        onPress={() => {
          if (c.contactPermission === 'denied') {
            void c.handleContactSettings();
            return;
          }
          if (c.isContactLookupOpen) {
            c.closeContactLookup();
            return;
          }
          select([]);
          void c.handleFindContacts();
        }}
      />
      {c.contactPermission === 'limited' && (
        <TextAction label="Manage selected contacts" onPress={c.handleContactSettings} />
      )}
      {c.contactNotice && (
        <AppText role="caption" accessibilityLiveRegion="polite">
          {c.contactNotice}
        </AppText>
      )}
      {c.isContactLookupOpen && c.contactMatches.length > 0 && (
        <>
          <TextInput
            accessibilityLabel="Filter contact matches"
            placeholder="Filter contacts"
            style={input}
            value={filter}
            onChangeText={setFilter}
          />
          <AppText role="caption">{selection.length} of 5 selected</AppText>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
            {matches.map((p) => {
              const checked = selection.includes(p.id);
              const disabled = busy || (!checked && selection.length >= 5);
              return (
                <View
                  key={p.id}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor: pending.has(p.id) ? t.colors.subtle : t.colors.surface,
                    borderBottomWidth: 1,
                    borderColor: t.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => open(p.id, p.alias || p.contactName)}
                      style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
                    >
                      <AppText style={{ color: pending.has(p.id) ? t.colors.secondary : t.colors.text }}>
                        {p.contactName}
                      </AppText>
                      <AppText role="caption">
                        {pending.has(p.id)
                          ? 'Request pending'
                          : inbound.has(p.id)
                            ? 'Requested you'
                            : p.alias
                              ? '@' + p.alias
                              : ''}
                      </AppText>
                    </Pressable>
                    {eligible(p.id) && (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={'Select ' + p.contactName}
                        accessibilityState={{ checked, disabled }}
                        disabled={disabled}
                        onPress={() =>
                          select(checked ? selection.filter((k) => k !== p.id) : [...selection, p.id])
                        }
                        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <AppText style={{ fontSize: 22, color: disabled ? t.colors.secondary : t.colors.accent }}>
                          {checked ? '☑' : '☐'}
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                  {inbound.has(p.id) && incomingActions(p.id)}
                </View>
              );
            })}
          </ScrollView>
          <ActionButton
            label={
              selection.length
                ? 'Send ' + selection.length + ' friend request' + (selection.length === 1 ? '' : 's')
                : 'Send friend requests'
            }
            disabled={busy || !selection.length}
            onPress={async () => {
              const failed = await send(selection);
              select(failed);
            }}
          />
        </>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText style={{ flex: 1 }}>Let contacts find me</AppText>
        <Switch
          accessibilityLabel="Let contacts find me"
          value={c.isContactDiscoverable}
          disabled={c.isUpdatingDiscoverability}
          onValueChange={c.handleDiscoverabilityChange}
        />
      </View>
    </Surface>
  );
}
