// Khả năng của nền tảng mà Container cần biết (tách riêng để test mock được).
import { Platform } from 'react-native';

/**
 * "Ghi nhớ đăng nhập" cần kho bảo mật của OS (Keychain/Keystore). Trình duyệt không có kho này,
 * nên trên Expo Web tùy chọn bị ẩn và phiên chỉ nằm trong bộ nhớ tab (CR-01 E-04, quyết định Q1).
 */
export const supportsRememberMe = Platform.OS !== 'web';
