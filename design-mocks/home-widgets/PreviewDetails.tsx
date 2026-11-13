import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppText, ActionButton, Surface } from '../../app/components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../app/theme/widgetTheme';
import { ProfileIdentity, type ProfileIdentityModel } from '../../app/features/profile/components/ProfileWidgets';
import { type CirclePerson } from '../../app/features/friends/components/CircleWidgets';

import { APP_INVITE_URL, APP_NAME } from '../../app/config/branding';
import { batchLimit, sampleContacts, people, type ContactRelation } from './fixtures';
import { TextAction } from '../../app/components/ui/ScreenControls';

export function ProfileEditor({
  profile,
  onSave,
}: {
  profile: ProfileIdentityModel;
  onSave: (p: ProfileIdentityModel) => void;
}) {
  const t = useWidgetTheme();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const field = {
    fontFamily: t.type.body,
    color: t.colors.text,
    minHeight: 46,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.control,
    padding: 12,
  };
  return (
    <>
      <AppText role="heading">Edit profile</AppText>
      <AppText>Name</AppText>
      <TextInput accessibilityLabel="Name" style={field} maxLength={50} value={name} onChangeText={setName} />
      <AppText>Bio</AppText>
      <TextInput
        accessibilityLabel="Bio"
        style={field}
        maxLength={160}
        multiline
        value={bio}
        onChangeText={setBio}
      />
      <ActionButton
        label="Save changes"
        disabled={!name.trim()}
        onPress={() => onSave({ ...profile, name: name.trim(), bio: bio.trim() })}
      />
    </>
  );
}

export function DiscoverFriends({
  onPerson,
  relations,
  onRespond,
  onSend,
  offline,
}: {
  onPerson: (p: CirclePerson) => void;
  relations: Record<string, ContactRelation>;
  onRespond: (id: string, accept: boolean) => void;
  onSend: (ids: readonly string[]) => void;
  offline: boolean;
}) {
  const t = useWidgetTheme();
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const selected = selection.filter((id) => !relations[id]);
  const contactList = sampleContacts.filter(
    (p) => relations[p.id] !== 'friends' && relations[p.id] !== 'dismissed',
  );
  const filtered = contactList.filter((p) =>
    (p.name + ' ' + p.alias).toLowerCase().includes(localQuery.trim().toLowerCase()),
  );
  const toggle = (id: string) =>
    setSelection(
      selected.includes(id)
        ? selected.filter((key) => key !== id)
        : selected.length < batchLimit
          ? [...selected, id]
          : selected,
    );
  const search = query.trim().toLowerCase();
  const number = search.replace(/[^0-9]/g, '');
  const term = search.replace(/^@/, '');
  const directory = [...people, ...sampleContacts];
  const isEmail = search.includes('@') && !search.startsWith('@');
  const isPhone = /^[+()0-9. -]+$/.test(search);
  const matches = directory.filter((person) => {
    if (isEmail) return person.id === 'tess' && search === 'tess@example.com';
    if (isPhone) return person.id === 'tess' && ['2025550142', '12025550142'].includes(number);
    return term.length > 0 && (person.name + ' ' + person.alias).toLowerCase().includes(term);
  });
  const relationshipActions = (p: CirclePerson) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <ActionButton
        label="Accept"
        accessibilityLabel={`Accept request from ${p.name}`}
        disabled={offline}
        onPress={() => onRespond(p.id, true)}
      />
      <ActionButton
        outline
        label="Decline"
        accessibilityLabel={`Decline request from ${p.name}`}
        disabled={offline}
        onPress={() => onRespond(p.id, false)}
      />
    </View>
  );
  const personRow = (p: CirclePerson) => (
    <View key={p.id} style={{ gap: 4 }}>
      <TextAction label={p.name + ' · @' + p.alias} onPress={() => onPerson(p)} />
      {relations[p.id] === 'incoming' ? (
        relationshipActions(p)
      ) : relations[p.id] === 'outgoing' ? (
        <AppText role="caption" style={{ color: t.colors.secondary }}>
          Request pending
        </AppText>
      ) : sampleContacts.some((c) => c.id === p.id) && !relations[p.id] ? (
        <ActionButton
          label="Send friend request"
          accessibilityLabel={`Send friend request to ${p.name}`}
          onPress={() => onSend([p.id])}
          disabled={offline}
        />
      ) : null}
    </View>
  );
  return (
    <Surface style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">
        Discover friends
      </AppText>
      <TextInput
        accessibilityLabel="Name, alias, email or phone"
        placeholder="Name, alias, email or phone"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={t.colors.secondary}
        style={{
          minHeight: 46,
          paddingHorizontal: 12,
          color: t.colors.text,
          fontFamily: t.type.body,
          borderColor: t.colors.border,
          borderRadius: t.radius.control,
          borderWidth: 1,
        }}
      />
      {matches.map(personRow)}
      {search && !matches.length && <AppText>No matching people.</AppText>}
      <ActionButton
        outline
        label={contacts ? 'Hide contact matches' : 'Find from contacts'}
        onPress={() => setContacts(!contacts)}
      />
      {contacts && (
        <>
          <TextInput
            accessibilityLabel="Filter contact matches"
            placeholder="Filter your contacts"
            value={localQuery}
            onChangeText={setLocalQuery}
            placeholderTextColor={t.colors.secondary}
            style={{
              minHeight: 44,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.control,
              color: t.colors.text,
              fontFamily: t.type.body,
            }}
          />
          <AppText role="caption" accessibilityLiveRegion="polite">
            {selected.length} of {batchLimit} selected
          </AppText>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{
              maxHeight: 260,
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.control,
            }}
          >
            {filtered.map((p) => {
              const status = relations[p.id];
              const pending = status === 'outgoing';
              const checked = selected.includes(p.id);
              const disabled = offline || (!checked && selected.length >= batchLimit);
              return (
                <View
                  key={p.id}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderBottomWidth: 1,
                    borderColor: t.colors.border,
                    backgroundColor: pending ? t.colors.subtle : t.colors.surface,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${p.name}'s profile`}
                      onPress={() => onPerson(p)}
                      style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}
                    >
                      <AppText
                        style={{
                          fontFamily: t.type.semibold,
                          color: pending ? t.colors.secondary : t.colors.text,
                        }}
                      >
                        {p.name}
                      </AppText>
                      <AppText role="caption" style={{ color: t.colors.secondary }}>
                        {pending ? 'Request pending' : status === 'incoming' ? 'Requested you' : '@' + p.alias}
                      </AppText>
                    </Pressable>
                    {!status && (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Select ${p.name}`}
                        accessibilityState={{ checked, disabled }}
                        disabled={disabled}
                        onPress={() => toggle(p.id)}
                        style={{
                          width: 44,
                          height: 44,
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: disabled ? 0.45 : 1,
                        }}
                      >
                        <View
                          style={{
                            width: 23,
                            height: 23,
                            borderWidth: 1.5,
                            borderColor: checked ? t.colors.accent : t.colors.secondary,
                            borderRadius: 6,
                            backgroundColor: checked ? t.colors.accent : t.colors.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {checked && (
                            <AppText role="caption" style={{ color: t.colors.onAccent }}>
                              ✓
                            </AppText>
                          )}
                        </View>
                      </Pressable>
                    )}
                  </View>
                  {status === 'incoming' && relationshipActions(p)}
                </View>
              );
            })}
            {!filtered.length && <AppText style={{ padding: 12 }}>No matching contacts.</AppText>}
          </ScrollView>
          <ActionButton
            label={
              selected.length
                ? `Send ${selected.length} friend request${selected.length === 1 ? '' : 's'}`
                : 'Send friend requests'
            }
            disabled={offline || !selected.length}
            onPress={() => {
              onSend(selected);
              setSelection([]);
            }}
          />
        </>
      )}
    </Surface>
  );
}

export function InviteCircle() {
  const [fallback, setFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join me on ${APP_NAME}`, url: APP_INVITE_URL });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }
    setFallback(true);
  };
  return (
    <Surface tone="upcoming" style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">
        Grow your circle
      </AppText>
      <AppText>Invite a friend to join you.</AppText>
      <ActionButton label="Share invite link" onPress={() => void share()} />
      <ActionButton
        label={copied ? 'Link copied' : 'Copy invite link'}
        onPress={async () => {
          try {
            await navigator.clipboard.writeText(APP_INVITE_URL);
            setCopied(true);
            setManual(false);
          } catch {
            setCopied(false);
            setManual(true);
          }
        }}
      />
      {(fallback || manual) && <AppText selectable>{APP_INVITE_URL}</AppText>}
      {manual && <AppText role="caption">Select the link above to copy it.</AppText>}
    </Surface>
  );
}

export function OutwardProfile({
  identity,
  relation,
  comparison,
  updates,
  action,
}: {
  identity: ProfileIdentityModel;
  relation: string;
  comparison?: ReactNode;
  updates: ReactNode;
  action?: ReactNode;
}) {
  const t = useWidgetTheme();
  return (
    <>
      <AppText role="heading" accessibilityRole="header">
        Profile
      </AppText>
      <ProfileIdentity profile={identity} />
      <AppText style={{ color: t.colors.secondary }}>{relation}</AppText>
      {action}
      {comparison}
      {updates && (
        <>
          <AppText role="heading" accessibilityRole="header">
            Shared updates
          </AppText>
          {updates}
        </>
      )}
    </>
  );
}
