// P2-FE-10 sẽ bổ sung sửa hồ sơ; Phase 1 chỉ cần xem + đăng xuất (E2E-01).
import { useState } from 'react';
import { authApi } from '@/api/auth';
import { useMe } from '@/api/queries/useMe';
import { Screen } from '@/ui';
import { ProfileView } from '../components/ProfileView';

export function ProfileContainer() {
  const me = useMe();
  const [confirming, setConfirming] = useState(false);
  return (
    <Screen>
      <ProfileView
        name={me.data?.full_name}
        email={me.data?.email}
        loading={me.isLoading}
        confirmingLogout={confirming}
        onAskLogout={() => setConfirming(true)}
        onCancelLogout={() => setConfirming(false)}
        onConfirmLogout={() => void authApi.logout()}
      />
    </Screen>
  );
}
