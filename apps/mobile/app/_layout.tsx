// P1-FE-03 — Khung điều hướng: Auth stack ↔ Main (tabs). Chặn truy cập khi chưa đăng nhập bằng Stack.Protected.
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/api/queryClient';
import { useSessionBootstrap } from '@/features/auth/useSessionBootstrap';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function RootNavigator() {
  const status = useSessionBootstrap();
  const t = useTheme();
  if (status === 'unknown') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.bg }}>
        <ActivityIndicator color={t.color.primary} accessibilityLabel="Đang khôi phục phiên đăng nhập" />
      </View>
    );
  }
  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.color.bg } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="history" options={{ headerShown: true, title: 'Lịch sử khoản chi' }} />
        <Stack.Screen name="transaction/[id]" options={{ headerShown: true, title: 'Chi tiết khoản chi' }} />
        <Stack.Screen name="opening-balance" options={{ headerShown: true, title: 'Số dư ban đầu' }} />
        <Stack.Screen name="jars" options={{ headerShown: true, title: 'Hũ tiết kiệm' }} />
        <Stack.Screen name="categories" options={{ headerShown: true, title: 'Danh mục' }} />
        <Stack.Screen name="ai" options={{ headerShown: true, title: 'Trợ lý AI' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <RootNavigator />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
