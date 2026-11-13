import { PendingEmail, AccountEmailSummary } from '../../components/EmailChangeForm';
import ContactDetails from '../ContactDetails';
import { supabase } from '../../../../services/supabase/client';

jest.mock('../../../../services/supabase/auth', () => ({ signOut: jest.fn() }));
jest.mock('../../../../state/sessionStore', () => ({ useSessionStore: {} }));
jest.mock('../../../../services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), auth: { getUser: jest.fn() } },
}));
const { act, create } = require('react-test-renderer');

it.each([
  ['confirmed email', '2026-11-13', null, true],
  ['unconfirmed email', null, null, false],
  ['pending email change', '2026-11-13', 'other@example.test', false],
])('checks %s independently of an absent phone number', async (_label, confirmed, pending, ready) => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: {
    id: 'member', email: 'member@example.test', email_confirmed_at: confirmed, new_email: pending,
    phone: '', phone_confirmed_at: null,
  } } });
  const onReady = jest.fn();
  let screen: ReturnType<typeof create>;
  try {
    await act(async () => { screen = create(<ContactDetails userId="member" onReady={onReady} />); });
    expect(onReady).toHaveBeenLastCalledWith(ready);
    if (pending) {
      const verification = screen!.root.findByType(PendingEmail);
      expect(verification.props.address).toBe(pending);
      (supabase.rpc as jest.Mock).mockImplementation(async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: {
          id: 'member', email: 'member@example.test', email_confirmed_at: confirmed, new_email: '',
        } } });
        return { error: null };
      });
      await act(async () => verification.props.onKeep());
      expect(onReady).toHaveBeenLastCalledWith(true);
    }
    await act(async () => screen!.update(<ContactDetails key="settings" userId="member" settings />));
    expect(screen!.root.findByType(AccountEmailSummary).props.onEdit).toBeUndefined();
    expect(screen!.root.findAllByType(PendingEmail)).toHaveLength(0);
  } finally {
    await act(async () => screen?.unmount());
  }
});
