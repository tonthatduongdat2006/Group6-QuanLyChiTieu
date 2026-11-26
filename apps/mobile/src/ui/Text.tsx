import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'money';

export function Text({ variant = 'body', muted, color, style, ...rest }: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const t = useTheme();
  const size = { title: t.font.xxl, heading: t.font.lg, body: t.font.md, caption: t.font.sm, money: t.font.xl }[variant];
  const weight = variant === 'title' || variant === 'heading' || variant === 'money' ? '700' : '400';
  return (
    <RNText
      // tôn trọng cỡ chữ hệ thống (không đặt allowFontScaling=false)
      style={[{ fontSize: size, fontWeight: weight, color: color ?? (muted ? t.color.textMuted : t.color.text) }, style]}
      {...rest}
    />
  );
}
