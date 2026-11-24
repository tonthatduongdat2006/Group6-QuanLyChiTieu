import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** percent: số nguyên 0..∞ đã tính sẵn từ server/Container; >100 hiển thị đầy + màu vượt. */
export function ProgressBar({ percent, tone = 'ok' }: { percent: number; tone?: 'ok' | 'warning' | 'exceeded' }) {
  const t = useTheme();
  const fill = { ok: t.color.primary, warning: t.color.warning, exceeded: t.color.danger }[tone];
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(percent, 100) }} style={{ height: 8, backgroundColor: t.color.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, height: '100%', backgroundColor: fill }} />
    </View>
  );
}
