import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/** Thông báo lỗi/cảnh báo trong màn hình (vd lỗi đăng nhập, INSUFFICIENT_BALANCE). */
export function Banner({ tone = 'danger', message, testID }: { tone?: 'danger' | 'warning' | 'info'; message: string; testID?: string }) {
  const t = useTheme();
  const map = {
    danger: { bg: t.color.dangerSoft, fg: t.color.danger, icon: 'alert-circle' as const },
    warning: { bg: t.color.warningSoft, fg: t.color.warning, icon: 'warning' as const },
    info: { bg: t.color.primarySoft, fg: t.color.primary, icon: 'information-circle' as const },
  }[tone];
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: map.bg, padding: 12, borderRadius: t.radius.md }}
    >
      <Ionicons name={map.icon} size={20} color={map.fg} />
      <Text variant="caption" color={map.fg} style={{ flex: 1 }}>{message}</Text>
    </View>
  );
}
