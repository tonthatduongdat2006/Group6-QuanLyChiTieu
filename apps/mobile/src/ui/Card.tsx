import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ style, ...rest }: ViewProps) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.color.surface, borderRadius: t.radius.lg, padding: t.space(4), gap: t.space(2) }, style]} {...rest} />;
}
