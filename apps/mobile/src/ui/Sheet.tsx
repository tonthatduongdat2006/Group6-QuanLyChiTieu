import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" onPress={onClose} style={{ flex: 1, backgroundColor: '#0006' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: t.color.surface, borderTopLeftRadius: t.radius.lg, borderTopRightRadius: t.radius.lg, padding: t.space(5), gap: t.space(3) }}>
          <Text variant="heading">{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
