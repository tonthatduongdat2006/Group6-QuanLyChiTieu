// P1-FE-02 — design tokens (light/dark). Đổi màu thương hiệu tại đây, không rải mã màu trong component.
export const palette = {
  green600: '#0F9D58',
  green700: '#0B7A44',
  green50: '#E8F6EE',
  red600: '#D93025',
  red50: '#FDECEA',
  amber600: '#E37400',
  amber50: '#FEF3E2',
  gray900: '#1A1C1E',
  gray700: '#44474A',
  gray500: '#74777B',
  gray300: '#C4C7CB',
  gray100: '#F1F3F4',
  white: '#FFFFFF',
  black: '#000000',
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
  radius: { sm: 8, md: 12, lg: 20, pill: 999 },
  font: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 30 },
};

export const lightTheme: Theme = {
  dark: false,
  ...base,
  color: {
    bg: palette.gray100,
    surface: palette.white,
    surfaceAlt: palette.gray100,
    text: palette.gray900,
    textMuted: palette.gray500,
    border: palette.gray300,
    primary: palette.green600,
    primaryPressed: palette.green700,
    primarySoft: palette.green50,
    onPrimary: palette.white,
    income: palette.green600,
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
    bg: '#111315',
    surface: '#1C1F22',
    surfaceAlt: '#262A2E',
    text: '#E3E3E3',
    textMuted: '#9AA0A6',
    border: '#3C4043',
    primary: '#34C77B',
    primaryPressed: '#2AA866',
    primarySoft: '#16382A',
    onPrimary: '#06210F',
    income: '#34C77B',
    expense: '#F28B82',
    danger: '#F28B82',
    dangerSoft: '#3B1F1D',
    warning: '#FDD663',
    warningSoft: '#3A2F12',
  },
};
