import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const body = <View style={{ padding: t.space(5), gap: t.space(4) }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
