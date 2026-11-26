import { Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.pill, borderWidth: 1, borderColor: selected ? t.color.primary : t.color.border, backgroundColor: selected ? t.color.primarySoft : t.color.surface }}
    >
      <Text variant="caption" color={selected ? t.color.primary : undefined}>{label}</Text>
    </Pressable>
  );
}
