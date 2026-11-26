// Expo Web: chọn ảnh từ thiết bị (không mở camera — không đặt `capture`), nén cạnh dài ≤ 1600 px sang JPEG,
// đảm bảo ≤ 4 MB (QD). Ảnh chỉ nằm trong bộ nhớ trình duyệt; `release()` thu hồi object URL sau khi dùng.
export interface PickedImage {
  blob: Blob;
  previewUrl: string;
  release: () => void;
}

export class ImagePickError extends Error {}

export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT.join(',');
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImagePickError('Không đọc được ảnh, vui lòng chọn ảnh khác');
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new ImagePickError('Trình duyệt không hỗ trợ xử lý ảnh');
  ctx2d.fillStyle = '#fff';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  ctx2d.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= RECEIPT_MAX_BYTES) {
      canvas.width = canvas.height = 0; // giải phóng bộ nhớ canvas
      return blob;
    }
  }
  throw new ImagePickError('Ảnh quá lớn, vui lòng chọn ảnh khác');
}

export async function pickReceiptImage(): Promise<PickedImage | null> {
  const file = await chooseFile();
  if (!file) return null;
  if (!ACCEPT.includes(file.type)) throw new ImagePickError('Chỉ nhận ảnh JPEG, PNG hoặc WEBP');
  const blob = await compress(file);
  const previewUrl = URL.createObjectURL(blob);
  return { blob, previewUrl, release: () => URL.revokeObjectURL(previewUrl) };
}
