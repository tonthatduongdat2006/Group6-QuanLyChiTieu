import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.color.primary,
        tabBarInactiveTintColor: t.color.textMuted,
        tabBarStyle: { backgroundColor: t.color.surface, borderTopColor: t.color.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen
        name="add"
        options={{ title: 'Thêm chi', tabBarIcon: ({ size }) => <Ionicons name="add-circle" size={size + 14} color={t.color.primary} />, tabBarAccessibilityLabel: 'Thêm khoản chi' }}
      />
      <Tabs.Screen name="scan" options={{ title: 'Quét hóa đơn', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="me" options={{ title: 'Cá nhân', tabBarIcon: icon('person-outline') }} />
      {/* Ngoài phạm vi MVP (CR-01): ẩn khỏi thanh tab */}
      <Tabs.Screen name="stats" options={{ href: null }} />
      <Tabs.Screen name="budgets" options={{ href: null }} />
    </Tabs>
  );
}
