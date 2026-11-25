import React from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';

export type QuickMessageInputProps = {
  value: string;
  loading: boolean;
  errorMessage?: string | null;
  onChangeText: (text: string) => void;
  onSubmitParse: () => void;
};

export function QuickMessageInput({
  value,
  loading,
  errorMessage,
  onChangeText,
  onSubmitParse,
}: QuickMessageInputProps) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Nhập nhanh tin nhắn, vd: ăn sáng 40k hôm qua"
        editable={!loading}
      />
      <Pressable onPress={onSubmitParse} disabled={loading || !value.trim()}>
        <Text>{loading ? 'Đang phân tích...' : 'Phân tích tin nhắn'}</Text>
      </Pressable>
      {errorMessage ? <Text>{errorMessage}</Text> : null}
    </View>
  );
}
