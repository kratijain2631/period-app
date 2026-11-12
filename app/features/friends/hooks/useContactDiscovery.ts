import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import {
  fetchContactDiscoverability,
  findDiscoverableContacts,
  getContactDiscoveryPermission,
  requestContactDiscoveryPermission,
  setContactDiscoverability,
  type ContactDiscoveryPermission,
  type ContactMatch,
} from '../../../services/contacts/contactDiscovery';

// Native permission/read calls can hang too; always restore an actionable UI.
const withDeadline = <T,>(operation: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Contacts operation timed out')), 15000);
  operation.then(resolve, reject).finally(() => clearTimeout(timeout));
});

export const useContactDiscovery = (userId: string | undefined, isFocused: boolean) => {
  const [contactPermission, setContactPermission] = useState<ContactDiscoveryPermission>('undetermined');
  const [contactMatches, setContactMatches] = useState<ContactMatch[]>([]);
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [isFindingContacts, setFindingContacts] = useState(false);
  const [isContactDiscoverable, setContactDiscoverable] = useState(false);
  const [isUpdatingDiscoverability, setUpdatingDiscoverability] = useState(false);
  const lookupVersion = useRef(0);
  const preferenceVersion = useRef(0);

  const invalidateLookup = useCallback(() => {
    lookupVersion.current += 1;
    setContactMatches([]);
    setFindingContacts(false);
  }, []);

  useEffect(() => {
    invalidateLookup();
    setContactPermission('undetermined');
    setContactDiscoverable(false);
    setUpdatingDiscoverability(false);
    setContactNotice(null);
    const preference = ++preferenceVersion.current;
    if (!isFocused || !userId) return;

    const refreshPermission = async (returningFromSettings = false) => {
      invalidateLookup();
      const version = lookupVersion.current;
      try {
        const permission = await withDeadline(getContactDiscoveryPermission());
        if (version === lookupVersion.current) {
          setContactPermission(permission);
          setContactNotice(permission === 'denied'
            ? 'Contacts access is off. You can enable it in iOS Settings.'
            : returningFromSettings ? 'Contacts access updated. Tap Find Contacts to check.' : null);
        }
      } catch {
        if (version === lookupVersion.current) {
          setContactNotice('Could not check Contacts access. Try again or open iOS Settings.');
        }
      }
    };
    void refreshPermission();
    void withDeadline(fetchContactDiscoverability()).then((enabled) => {
      if (preference === preferenceVersion.current) setContactDiscoverable(enabled);
    }).catch(() => {
      if (preference === preferenceVersion.current) {
        setContactNotice('Could not load contact discoverability. Try again when connected.');
      }
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermission(true);
      else invalidateLookup();
    });
    return () => {
      lookupVersion.current += 1;
      preferenceVersion.current += 1;
      subscription.remove();
    };
  }, [invalidateLookup, isFocused, userId]);

  const handleFindContacts = useCallback(async () => {
    if (!userId || !isFocused || isFindingContacts) return;
    invalidateLookup();
    const version = lookupVersion.current;
    setFindingContacts(true);
    setContactNotice('Checking the contacts you have allowed…');
    try {
      let permission = await withDeadline(getContactDiscoveryPermission());
      if (version !== lookupVersion.current) return;
      if (permission === 'undetermined') {
        // The native sheet can background the app; require a fresh explicit lookup afterward.
        permission = await withDeadline(requestContactDiscoveryPermission());
      }
      if (version !== lookupVersion.current) return;
      setContactPermission(permission);
      if (permission !== 'granted' && permission !== 'limited') {
        setContactNotice('Contacts access is off. You can enable it in iOS Settings.');
        return;
      }
      const matches = await withDeadline(findDiscoverableContacts());
      if (version !== lookupVersion.current) return;
      const others = matches.filter((match) => match.id !== userId);
      setContactMatches(others);
      setContactNotice(others.length === 0
        ? 'No discoverable contacts found. Contacts need a phone number or email matching their account and “Let contacts find me” turned on.'
        : null);
    } catch {
      if (version === lookupVersion.current) {
        setContactNotice('Could not check contacts. Try again, or manage Contacts access in iOS Settings.');
      }
    } finally {
      if (version === lookupVersion.current) setFindingContacts(false);
    }
  }, [invalidateLookup, isFindingContacts, isFocused, userId]);

  const handleContactSettings = useCallback(async () => {
    invalidateLookup();
    const version = lookupVersion.current;
    setContactNotice('Choose Contacts access in Settings, then return and tap Find Contacts.');
    try {
      // iOS contactAccessPicker can present an invisible sheet and swallow taps:
      // https://github.com/expo/expo/issues/46977. Settings works for limited and denied access.
      await Linking.openSettings();
    } catch {
      if (version === lookupVersion.current) {
        setContactNotice('Open iPhone Settings → Apps → this app → Contacts to manage access.');
      }
    }
  }, [invalidateLookup]);

  const handleDiscoverabilityChange = useCallback(async (enabled: boolean) => {
    if (!userId || !isFocused || isUpdatingDiscoverability) return;
    const version = ++preferenceVersion.current;
    setUpdatingDiscoverability(true);
    setContactNotice(null);
    try {
      await withDeadline(setContactDiscoverability(enabled, userId));
      if (version === preferenceVersion.current) setContactDiscoverable(enabled);
    } catch {
      if (version === preferenceVersion.current) {
        setContactNotice('Could not confirm contact discoverability. Check your connection and try again.');
      }
    } finally {
      if (version === preferenceVersion.current) setUpdatingDiscoverability(false);
    }
  }, [isFocused, isUpdatingDiscoverability, userId]);

  return {
    contactPermission, contactMatches, contactNotice, isFindingContacts,
    isContactDiscoverable, isUpdatingDiscoverability,
    handleFindContacts, handleContactSettings, handleDiscoverabilityChange,
  };
};
