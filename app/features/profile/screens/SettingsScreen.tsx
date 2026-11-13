import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import { deleteCurrentAccount, signOut } from '../../../services/supabase/auth';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { RankingVisibility } from '../components/RankingVisibility';
import { SettingsPage } from '../components/SettingsPage';
import ContactDetails from './ContactDetails';

export default function SettingsScreen() {
  const session = useSessionStore(selectSession);
  const t = useWidgetTheme();
  const navigation = useNavigation<any>();
  const [accountAction, setAccountAction] = useState<'idle' | 'signingOut' | 'deleting'>('idle');
  const [accountError, setAccountError] = useState<string | null>(null);
  const handleSignOut = useCallback(async () => {
    if (accountAction !== 'idle') {
      return;
    }
    setAccountError(null);
    setAccountAction('signingOut');
    try {
      await signOut();
      useSessionStore.getState().reset();
    } catch (error) {
      console.warn('[profile] Failed to sign out', error);
      setAccountError('Could not sign out right now.');
    } finally {
      setAccountAction('idle');
    }
  }, [accountAction]);

  const confirmDeleteAccount = useCallback(() => {
    if (accountAction !== 'idle') {
      return;
    }
    Alert.alert('Delete account?', 'This permanently removes your account and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAccountError(null);
          setAccountAction('deleting');
          try {
            await deleteCurrentAccount();
            useSessionStore.getState().reset();
          } catch (error) {
            console.warn('[profile] Failed to delete account', error);
            setAccountError('Could not delete account right now.');
          } finally {
            setAccountAction('idle');
          }
        },
      },
    ]);
  }, [accountAction]);

  if (!session) return null;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: t.colors.canvas }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <SettingsPage
        contacts={<ContactDetails key={session.userId} userId={session.userId} settings />}
        visibility={<RankingVisibility key={session.userId} userId={session.userId} />}
        onPosting={() => navigation.navigate('AutoPostSettings')}
        onSignOut={handleSignOut}
        onDelete={confirmDeleteAccount}
        busy={accountAction !== 'idle'}
        message={
          accountError ||
          (accountAction === 'signingOut'
            ? 'Signing out…'
            : accountAction === 'deleting'
              ? 'Deleting account…'
              : null)
        }
      />
    </ScrollView>
  );
}
