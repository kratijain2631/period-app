declare module 'expo-apple-authentication' {
  import * as React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export enum AppleAuthenticationScope {
    FULL_NAME = 0,
    EMAIL = 1,
  }

  export enum AppleAuthenticationButtonType {
    SIGN_IN = 0,
    CONTINUE = 1,
  }

  export enum AppleAuthenticationButtonStyle {
    WHITE = 0,
    WHITE_OUTLINE = 1,
    BLACK = 2,
  }

  export type AppleAuthenticationFullName = {
    familyName?: string | null;
    givenName?: string | null;
    middleName?: string | null;
    namePrefix?: string | null;
    nameSuffix?: string | null;
    nickname?: string | null;
  };

  export type AppleAuthenticationCredential = {
    user: string;
    email?: string | null;
    fullName?: AppleAuthenticationFullName | null;
    identityToken?: string | null;
    authorizationCode?: string | null;
    authorizedScopes?: AppleAuthenticationScope[];
    realUserStatus?: number;
    state?: string | null;
  };

  export type AppleAuthenticationSignInOptions = {
    requestedScopes?: AppleAuthenticationScope[];
    state?: string;
  };

  export function isAvailableAsync(): Promise<boolean>;
  export function signInAsync(options?: AppleAuthenticationSignInOptions): Promise<AppleAuthenticationCredential>;

  export type AppleAuthenticationButtonProps = {
    buttonType: AppleAuthenticationButtonType;
    buttonStyle: AppleAuthenticationButtonStyle;
    cornerRadius?: number;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    disabled?: boolean;
  };

  export const AppleAuthenticationButton: React.ComponentType<AppleAuthenticationButtonProps>;
}
