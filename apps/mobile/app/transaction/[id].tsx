import { useLocalSearchParams } from 'expo-router';
import { TransactionDetailContainer } from '@/features/expenses/containers/HistoryContainer';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionDetailContainer id={String(id)} />;
}
