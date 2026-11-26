import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  secure?: boolean;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, hint, secure, style, ...rest }, ref) {
  const t = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" style={{ fontWeight: '600' }}>{label}</Text>
      <View
        style={[
          styles.box,
          { borderColor: error ? t.color.danger : t.color.border, backgroundColor: t.color.surface, borderRadius: t.radius.md },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={t.color.textMuted}
          secureTextEntry={secure && hidden}
          style={[styles.input, { color: t.color.text, fontSize: t.font.md }, style]}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.color.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={t.color.danger} accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        <Text variant="caption" muted>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, minHeight: 48 },
  input: { flex: 1, paddingVertical: 10 },
});
