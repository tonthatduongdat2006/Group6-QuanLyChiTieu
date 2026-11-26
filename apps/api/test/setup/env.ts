// Chạy trước mọi suite integration: ép môi trường test an toàn.
process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'fake'; // P0-TD-05: không bao giờ gọi live AI
process.env.AI_API_KEY = '';
process.env.JWT_ACCESS_SECRET ??= 'test-only-secret-at-least-32-characters!!';
process.env.THROTTLE_LIMIT ??= '10000';
process.env.TZ = 'UTC';
if (!process.env.DATABASE_URL?.includes('test')) {
  throw new Error('DATABASE_URL phải trỏ tới DB test (tên chứa "test") — tránh xóa nhầm dữ liệu dev');
}
