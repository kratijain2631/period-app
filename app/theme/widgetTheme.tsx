import { createContext, useContext, type ReactNode } from 'react';
import { brand } from './brand';
import type { CyclePhase } from '../../packages/domain/cycles/models';

type PhaseStyle = { chart: string; text: string; surface: string };
export type WidgetTheme = {
  illustrated: boolean;
  colors: { canvas: string; surface: string; border: string; text: string; secondary: string;
    accent: string; onAccent: string; subtle: string; guidance: string; guidanceText: string;
    upcoming: string; circleCover: string; profileCover: string; error: string; success: string };
  phase: Record<CyclePhase, PhaseStyle>;
  type: typeof brand.typography;
  radius: { card: number; control: number };
};
export const illustratedTheme: WidgetTheme = {
  illustrated: true,
  colors: { canvas: '#FBF8F4', surface: '#FFFCF8', border: '#EEE3D8', text: '#322E2A',
    secondary: '#6F6962', accent: '#C65A3D', onAccent: '#FFFFFF', subtle: '#F1EAE2',
    guidance: '#F6E8ED', guidanceText: '#805B87', upcoming: '#FBF2E4', circleCover: '#F1F0DA', profileCover: '#F8EBE1', error: '#A63831', success: '#536E4C' },
  phase: {
    menstruation: { chart: '#D16B4D', text: '#AE4932', surface: '#FBEAE3' },
    follicular: { chart: '#98AA8C', text: '#617651', surface: '#EDF1E8' },
    ovulation: { chart: '#EDB544', text: '#886018', surface: '#FBF2DC' },
    luteal: { chart: '#7C9DB8', text: '#456C8A', surface: '#EAF0F5' },
    pms: { chart: '#B18AA2', text: '#875D78', surface: '#F5EAF0' },
    unknown: { chart: '#C1B9AE', text: '#70695F', surface: '#F1EAE2' },
  },
  type: brand.typography,
  radius: { card: 24, control: 14 },
};
export const neutralTheme: WidgetTheme = {
  ...illustratedTheme, illustrated: false,
  colors: { ...illustratedTheme.colors, canvas: '#F5F5F5', surface: '#FFFFFF', border: '#E1E1E1', guidance: '#F0F1F2', upcoming: '#F0F1F2', circleCover: '#FFFFFF', profileCover: '#FFFFFF' },
  radius: { card: 12, control: 8 },
};
const ThemeContext = createContext(illustratedTheme);
export const WidgetThemeProvider = ({ theme = illustratedTheme, children }: { theme?: WidgetTheme; children: ReactNode }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);
export const useWidgetTheme = () => useContext(ThemeContext);
