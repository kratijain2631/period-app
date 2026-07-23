import type { TextStyle, ViewStyle } from 'react-native';

export const brand = {
  colors: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    primaryText: '#2D2A26',
    secondaryText: '#8A857E',
    tertiaryText: '#B5AFA7',
    separator: '#F0EDE8',
    accent: '#C4654A',
    accentSoft: '#FFF0EB',
    success: '#7BA68F',
    successBackground: '#EDF5F0',
    warningText: '#C4654A',
    warningBackground: '#FFF0EB',
    fill: '#EDE9E3',
    mutedFill: '#F7F5F2',
    disabled: '#DDD9D3',
    pendingText: '#8D5B2A',
    pendingBackground: '#FFF3E0',
    destructive: '#C4654A',
    white: '#FFFFFF',
  },
  typography: {
    display: 'Nunito_800ExtraBold',
    heading: 'Nunito_700Bold',
    body: 'Inter_400Regular',
    semibold: 'Inter_600SemiBold',
  },
  radius: {
    xs: 10,
    sm: 14,
    md: 18,
    lg: 24,
    xl: 28,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    } as ViewStyle,
    soft: {
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    } as ViewStyle,
  },
} as const;

type PhaseTone = {
  key: string;
  label: string;
  color: string;
  background: string;
  icon: 'water-outline' | 'leaf-outline' | 'sunny-outline' | 'moon-outline' | 'cloud-outline';
};

const phaseTones: Record<string, PhaseTone> = {
  menstruation: {
    key: 'menstruation',
    label: 'Menstruation',
    color: '#C4654A',
    background: '#FFF0EB',
    icon: 'water-outline',
  },
  follicular: {
    key: 'follicular',
    label: 'Follicular',
    color: '#7BA68F',
    background: '#EDF5F0',
    icon: 'leaf-outline',
  },
  ovulation: {
    key: 'ovulation',
    label: 'Ovulation',
    color: '#D4A252',
    background: '#FFF8ED',
    icon: 'sunny-outline',
  },
  luteal: {
    key: 'luteal',
    label: 'Luteal',
    color: '#6B8DB5',
    background: '#EEF3F8',
    icon: 'moon-outline',
  },
  pms: {
    key: 'pms',
    label: 'PMS',
    color: '#B56E9D',
    background: '#F8EAF2',
    icon: 'cloud-outline',
  },
  unknown: {
    key: 'unknown',
    label: 'Unknown',
    color: '#8A857E',
    background: '#F3F0EC',
    icon: 'cloud-outline',
  },
};

export const resolvePhaseTone = (phase?: string | null): PhaseTone => {
  if (!phase) {
    return phaseTones.unknown;
  }
  return phaseTones[phase.toLowerCase()] ?? phaseTones.unknown;
};

export const brandType = {
  display: {
    fontFamily: brand.typography.display,
    letterSpacing: -0.3,
  } as TextStyle,
  heading: {
    fontFamily: brand.typography.heading,
    letterSpacing: -0.2,
  } as TextStyle,
  body: {
    fontFamily: brand.typography.body,
  } as TextStyle,
  semibold: {
    fontFamily: brand.typography.semibold,
  } as TextStyle,
} as const;
