import React, { useState } from 'react';
import type { ParsedMessageDraft } from '@ase/contracts/src/ai-text';
import { isValidParsedAmount } from '../../rules/messageDraft';
import { QuickMessageInput } from './QuickMessageInput';

export type QuickMessageContainerProps = {
  apiBaseUrl: string;
  onDraftReady: (draft: ParsedMessageDraft) => void;
};

export function QuickMessageContainer({
  apiBaseUrl,
  onDraftReady,
}: QuickMessageContainerProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleParse = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập nội dung tin nhắn.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/ai/text/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        setErrorMessage(`Không thể phân tích tin nhắn (mã lỗi ${response.status}).`);
        return;
      }

      const payload = await response.json();
      const draft: ParsedMessageDraft | undefined = payload?.data;

      if (!draft || !isValidParsedAmount(draft.amountMinor)) {
        setErrorMessage('Chưa nhận diện được số tiền hợp lệ trong tin nhắn.');
        return;
      }

      onDraftReady(draft);
    } catch {
      setErrorMessage('Không thể kết nối tới máy chủ API. Kiểm tra URL API hoặc mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuickMessageInput
      value={message}
      loading={loading}
      errorMessage={errorMessage}
      onChangeText={setMessage}
      onSubmitParse={handleParse}
    />
  );
}
