import { Card, Screen, Text } from '@/ui';

/** Màn hình giữ chỗ cho khung điều hướng Phase 1; nội dung làm ở task được ghi. */
export function ComingSoon({ title, task }: { title: string; task: string }) {
  return (
    <Screen>
      <Text variant="title">{title}</Text>
      <Card>
        <Text muted>Màn hình này được xây ở {task}.</Text>
      </Card>
    </Screen>
  );
}
