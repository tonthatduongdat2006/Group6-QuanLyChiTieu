import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export function Checkbox({ checked, onChange, label, error, testID }: { checked: boolean; onChange: (v: boolean) => void; label: string; error?: string | null; testID?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
      >
        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? t.color.primary : t.color.textMuted} />
        <Text style={{ flex: 1 }}>{label}</Text>
      </Pressable>
      {error ? <Text variant="caption" color={t.color.danger}>{error}</Text> : null}
    </View>
  );
}
