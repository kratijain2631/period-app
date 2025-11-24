import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import type { Session } from '../../state/sessionStore';

export type AppleSignInResult = {
  session: Session;
  credential: AppleAuthentication.AppleAuthenticationCredential;
  identityToken: string;
};

export const signInWithApple = async (): Promise<AppleSignInResult> => {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const session: Session = {
    userId: credential.user,
    accessToken: credential.identityToken,
  };

  console.log(
    `[auth] Apple sign-in success user=${credential.user} scopes=${credential.authorizedScopes?.join(',') ?? 'none'} platform=${Platform.OS}`,
  );

  return {
    session,
    credential,
    identityToken: credential.identityToken,
  };
};
