import { View } from 'react-native';
import { Button, Card, Text } from '@/ui';

export interface ProfileViewProps {
  name?: string;
  email?: string;
  loading: boolean;
  confirmingLogout: boolean;
  onAskLogout: () => void;
  onConfirmLogout: () => void;
  onCancelLogout: () => void;
}

export function ProfileView({ name, email, loading, confirmingLogout, onAskLogout, onConfirmLogout, onCancelLogout }: ProfileViewProps) {
  return (
    <View style={{ gap: 16 }}>
      <Text variant="title">Cá nhân</Text>
      <Card>
        <Text variant="heading">{loading ? 'Đang tải…' : name}</Text>
        <Text muted>{email}</Text>
      </Card>
      {confirmingLogout ? (
        <Card>
          <Text>Bạn chắc chắn muốn đăng xuất?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Hủy" variant="secondary" onPress={onCancelLogout} style={{ flex: 1 }} />
            <Button testID="logout-confirm" title="Đăng xuất" variant="danger" onPress={onConfirmLogout} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button testID="logout" title="Đăng xuất" variant="secondary" onPress={onAskLogout} />
      )}
    </View>
  );
}
