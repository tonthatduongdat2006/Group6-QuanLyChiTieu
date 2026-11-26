import { router } from 'expo-router';
import { OpeningBalanceContainer } from '@/features/balance/containers/OpeningBalanceContainer';
import { Screen } from '@/ui';

export default function OpeningBalanceScreen() {
  return (
    <Screen>
      <OpeningBalanceContainer onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
