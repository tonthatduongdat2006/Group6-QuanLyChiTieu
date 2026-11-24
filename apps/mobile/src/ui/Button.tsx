import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading; // chống bấm đúp khi đang gửi
  const bg = { primary: t.color.primary, secondary: t.color.surfaceAlt, danger: t.color.danger, ghost: 'transparent' }[variant];
  const fg = { primary: t.color.onPrimary, secondary: t.color.text, danger: t.color.onPrimary, ghost: t.color.primary }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        { backgroundColor: bg, borderRadius: t.radius.md, opacity: isDisabled ? 0.6 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '600' }}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' } });
