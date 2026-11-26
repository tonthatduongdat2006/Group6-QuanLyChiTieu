// Kiểm ảnh hóa đơn trước khi gửi AI (M2-02): MIME khai báo phải khớp chữ ký (magic bytes) và cấu trúc tối thiểu
// của định dạng. Không giải mã toàn bộ ảnh (không thêm thư viện xử lý ảnh) — kiểm các dấu hiệu tệp bị cắt/hỏng.
export type ImageKind = 'image/jpeg' | 'image/png' | 'image/webp';

export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** true nếu tệp có cấu trúc đọc được: JPEG có SOI…EOI, PNG có IHDR + IEND, WEBP có kích thước RIFF khớp. */
export function looksDecodable(kind: ImageKind, buf: Buffer): boolean {
  switch (kind) {
    case 'image/jpeg': {
      const tail = buf.subarray(Math.max(0, buf.length - 64));
      return buf.length > 100 && tail.includes(Buffer.from([0xff, 0xd9]));
    }
    case 'image/png':
      return buf.length > 57 && buf.toString('ascii', 12, 16) === 'IHDR' && buf.subarray(buf.length - 12).toString('ascii', 4, 8) === 'IEND';
    case 'image/webp':
      return buf.length > 20 && buf.readUInt32LE(4) + 8 === buf.length;
  }
}
