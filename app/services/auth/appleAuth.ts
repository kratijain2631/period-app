import * as AppleAuthentication from 'expo-apple-authentication';
import { sha256 } from 'js-sha256';
import { Platform } from 'react-native';
import type { Session } from '../../state/sessionStore';
import { signInWithAppleIdToken } from '../supabase/auth';
import { upsertCurrentUserProfile } from '../supabase/users';

export type AppleSignInResult = {
  session: Session;
  credential: AppleAuthentication.AppleAuthenticationCredential;
  identityToken: string;
};

declare const crypto: {
  getRandomValues: (array: Uint8Array) => Uint8Array;
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const createNoncePair = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const rawNonce = toHex(bytes);
  const hashedNonce = sha256(rawNonce);
  return { rawNonce, hashedNonce };
};

export const signInWithApple = async (): Promise<AppleSignInResult> => {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const { rawNonce, hashedNonce } = createNoncePair();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    // `nonce` is supported at runtime and is required for our server-side nonce
    // check, but the installed type definitions omit it — cast so it's preserved.
    nonce: hashedNonce,
  } as AppleAuthentication.AppleAuthenticationSignInOptions);

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const session = await signInWithAppleIdToken(credential.identityToken, rawNonce);
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');

  upsertCurrentUserProfile({
    appleUserId: credential.user,
    email: credential.email ?? undefined,
    fullName: fullName || undefined,
  }).catch((error) => {
    console.warn('[auth] failed to upsert user profile', error);
  });

  console.log(
    `[auth] Apple sign-in success user=${credential.user} scopes=${credential.authorizedScopes?.join(',') ?? 'none'} platform=${Platform.OS}`,
  );

  return {
    session,
    credential,
    identityToken: credential.identityToken,
  };
};
