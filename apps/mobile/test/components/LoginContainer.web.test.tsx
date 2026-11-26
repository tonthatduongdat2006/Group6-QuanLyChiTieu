// CR-01 E-04 / Q1 — trên Expo Web không có "Ghi nhớ đăng nhập"; phiên chỉ trong bộ nhớ.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { LoginContainer } from '@/features/auth/containers/LoginContainer';
import { session } from '@/api/client';
import { renderWithProviders } from '../render';
import { installMockFetch } from '../msw/installFetch';
import { resetMockDb } from '../msw/handlers';

jest.mock('@/api/capabilities', () => ({ supportsRememberMe: false }));

let restoreFetch: () => void;
beforeEach(async () => {
  restoreFetch = installMockFetch();
  resetMockDb([{ email: 'a@test.vn', password: 'Example123' }]);
  await session.signOut({ callServer: false });
  (SecureStore.setItemAsync as jest.Mock).mockClear();
});
afterEach(() => restoreFetch());

describe('LoginContainer trên web', () => {
  it('không hiển thị "Ghi nhớ đăng nhập"', () => {
    renderWithProviders(<LoginContainer />);
    expect(screen.queryByTestId('login-remember')).toBeNull();
    expect(screen.queryByText('Ghi nhớ đăng nhập')).toBeNull();
  });

  it('đăng nhập thành công nhưng không lưu refresh token bền', async () => {
    renderWithProviders(<LoginContainer />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'a@test.vn');
    fireEvent.changeText(screen.getByTestId('login-password'), 'Example123');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(session.status).toBe('signedIn'));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
