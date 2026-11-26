// P1-FE-02 — design tokens (light/dark). Đổi màu thương hiệu tại đây, không rải mã màu trong component.
export const palette = {
  green600: '#0F766E',
  green700: '#115E59',
  green50: '#E6F4F1',
  red600: '#C2410C',
  red50: '#FFEDD5',
  amber600: '#B45309',
  amber50: '#FEF3C7',
  gray900: '#19243B',
  gray700: '#475569',
  gray500: '#5A6882',
  gray300: '#CBD5E1',
  gray100: '#F4F7FB',
  white: '#FCFDFE',
  black: '#0E1525',
};

export interface Theme {
  dark: boolean;
  color: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryPressed: string;
    primarySoft: string;
    onPrimary: string;
    income: string;
    expense: string;
    danger: string;
    dangerSoft: string;
    warning: string;
    warningSoft: string;
  };
  space: (n: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
}

const base = {
  space: (n: number) => n * 4,
  radius: { sm: 8, md: 12, lg: 18, pill: 999 },
  font: { xs: 12, sm: 13.5, md: 15, lg: 17, xl: 21, xxl: 28 },
};

export const lightTheme: Theme = {
  dark: false,
  ...base,
  color: {
    bg: palette.gray100,
    surface: palette.white,
    surfaceAlt: '#EEF3F8',
    text: palette.gray900,
    textMuted: palette.gray500,
    border: '#E2E8F0',
    primary: palette.green600,
    primaryPressed: palette.green700,
    primarySoft: palette.green50,
    onPrimary: '#F8FAFC',
    income: '#15803D',
    expense: palette.red600,
    danger: palette.red600,
    dangerSoft: palette.red50,
    warning: palette.amber600,
    warningSoft: palette.amber50,
  },
};

export const darkTheme: Theme = {
  dark: true,
  ...base,
  color: {
    bg: '#0E1525',
    surface: '#162036',
    surfaceAlt: '#1E2A44',
    text: '#E6EDF8',
    textMuted: '#9AA8C4',
    border: '#24314D',
    primary: '#2DD4BF',
    primaryPressed: '#14B8A6',
    primarySoft: '#12332F',
    onPrimary: '#06201D',
    income: '#4ADE80',
    expense: '#FB923C',
    danger: '#F87171',
    dangerSoft: '#381A10',
    warning: '#FBBF24',
    warningSoft: '#36260C',
  },
};
