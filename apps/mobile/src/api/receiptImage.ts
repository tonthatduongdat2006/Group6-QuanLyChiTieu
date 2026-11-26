// Chọn + nén ảnh hóa đơn. Bản native: MVP phát hành Expo Web (CR-01 E-01) và repo chưa có expo-image-picker,
// nên trên app native chức năng này báo không hỗ trợ thay vì giả lập.
export interface PickedImage {
  blob: Blob;
  previewUrl: string;
  release: () => void;
}

export class ImagePickError extends Error {}

export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;

export async function pickReceiptImage(): Promise<PickedImage | null> {
  throw new ImagePickError('Quét hóa đơn hiện chỉ hỗ trợ trên bản web');
}
