// RNTL + MSW — Container đăng nhập (AC-03, D-13a)
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { LoginContainer } from '@/features/auth/containers/LoginContainer';
import { session } from '@/api/client';
import { REFRESH_TOKEN_KEY } from '@/api/session';
import { renderWithProviders } from '../render';
import { installMockFetch } from '../msw/installFetch';
import { resetMockDb } from '../msw/handlers';

let restoreFetch: () => void;
beforeEach(async () => {
  restoreFetch = installMockFetch();
  resetMockDb([{ email: 'a@test.vn', password: 'Example123' }]);
  await session.signOut({ callServer: false });
});
afterEach(() => restoreFetch());

const fill = (email: string, password: string) => {
  fireEvent.changeText(screen.getByTestId('login-email'), email);
  fireEvent.changeText(screen.getByTestId('login-password'), password);
};

describe('LoginContainer', () => {
  it('validate phía client: không gọi API khi email sai', async () => {
    renderWithProviders(<LoginContainer />);
    fill('abc', '');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Email không hợp lệ')).toBeTruthy();
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeTruthy();
    expect(session.status).toBe('signedOut');
  });

  it('sai mật khẩu → banner lỗi chung từ server', async () => {
    renderWithProviders(<LoginContainer />);
    fill('a@test.vn', 'WrongPass1');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Email hoặc mật khẩu không đúng')).toBeTruthy();
  });

  it('ghi nhớ đăng nhập BẬT → đăng nhập thành công + refresh token vào SecureStore', async () => {
    renderWithProviders(<LoginContainer />);
    fill('a@test.vn', 'Example123');
    fireEvent.press(screen.getByTestId('login-remember'));
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(session.status).toBe('signedIn'));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'rt-u-1', expect.anything());
  });

  it('ghi nhớ đăng nhập TẮT → không lưu gì vào SecureStore', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    renderWithProviders(<LoginContainer />);
    fill('a@test.vn', 'Example123');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(session.status).toBe('signedIn'));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
