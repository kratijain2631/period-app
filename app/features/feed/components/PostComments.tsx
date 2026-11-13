import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppText, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { TextAction } from '../../../components/ui/ScreenControls';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import type { PostComment } from '../../../services/supabase/postComments';

export type CommentActions = {
  read: (start: number, limit: number) => Promise<PostComment[]>;
  add: (text: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
export function PostComments({
  self,
  offline,
  actions,
  revision,
  onProfile,
  focused = true,
}: {
  self: string;
  offline: boolean;
  actions: CommentActions;
  revision: number;
  onProfile: (id: string) => void;
  focused?: boolean;
}) {
  const theme = useWidgetTheme();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PostComment[]>([]);
  const [draft, setDraft] = useState('');
  const [limit, setLimit] = useState(20);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || !focused) return;
    let active = true;
    setLoading(true);
    actions
      .read(0, limit + 1)
      .then(
        (result) => {
          if (active) {
            setRows(result.slice(0, limit));
            setMore(result.length > limit);
            setError('');
          }
        },
        () => {
          if (active) {
            setRows([]);
            setMore(false);
            setError('Couldn’t load comments. Try again.');
          }
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, focused, actions.read, limit, revision, retry]);
  const mutate = async (id?: string) => {
    const body = draft.trim();
    if (lock.current || offline || (!id && (!body || body.length > 1000))) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (id) await actions.remove(id);
      else {
        await actions.add(body);
        setDraft('');
      }
      setRetry((v) => v + 1);
    } catch {
      setError(id ? 'Couldn’t delete the comment.' : 'Couldn’t post your comment. Your draft is still here.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <AppText style={{ color: theme.colors.accent, fontFamily: theme.type.semibold }}>
          {open ? 'Hide comments' : 'Comments'}
        </AppText>
      </Pressable>
      {open && (
        <>
          {error && <AppText accessibilityRole="alert">{error}</AppText>}
          {error && <TextAction label="Refresh comments" onPress={() => setRetry((v) => v + 1)} />}
          {loading && !rows.length ? (
            <AppText role="caption">Loading comments…</AppText>
          ) : !rows.length && !error ? (
            <AppText role="caption">No comments yet.</AppText>
          ) : null}
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 260 }}>
            {rows.map((row) => (
              <View
                key={row.id}
                style={{ paddingVertical: 6, borderTopWidth: 1, borderColor: theme.colors.border }}
              >
                <TextAction
                  label={
                    row.user_id === self ? 'You' : row.alias ? '@' + row.alias.replace(/^@/, '') : 'Circle member'
                  }
                  onPress={() => onProfile(row.user_id)}
                />
                <AppText>{row.body}</AppText>
                {row.user_id === self && (
                  <ActionButton
                    outline
                    label="Delete comment"
                    disabled={busy || offline}
                    onPress={() => void mutate(row.id)}
                  />
                )}
              </View>
            ))}
            {more && <TextAction label="Show more comments" onPress={() => setLimit((n) => n + 20)} />}
          </ScrollView>
          <TextInput
            accessibilityLabel="Write a comment"
            placeholder="Write a comment…"
            placeholderTextColor={theme.colors.secondary}
            multiline
            maxLength={1000}
            value={draft}
            onChangeText={setDraft}
            editable={!busy}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.control,
              padding: 10,
              minHeight: 44,
              color: theme.colors.text,
            }}
          />
          <ActionButton
            label="Post comment"
            disabled={busy || offline || !draft.trim()}
            onPress={() => void mutate()}
          />
        </>
      )}
    </View>
  );
}
