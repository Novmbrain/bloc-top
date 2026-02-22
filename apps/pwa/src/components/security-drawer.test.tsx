/**
 * SecurityDrawer 组件测试
 *
 * 在重构前捕获所有行为契约:
 * 1. 基本渲染 (各 section 可见性)
 * 2. Avatar 流程 (选择文件 → crop → upload / delete)
 * 3. Profile 编辑 (nickname, height, reach, ape index)
 * 4. 密码管理 (set / change, 验证逻辑)
 * 5. Passkey 管理 (列表 / 添加 / 删除)
 * 6. 登出 + Editor 入口
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@/test/utils'

// ─── Mocks ───────────────────────────────────────
// toast
const mockShowToast = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

// passkey management
const mockAddPasskey = vi.fn()
const mockDeletePasskey = vi.fn()
vi.mock('@/hooks/use-passkey-management', () => ({
  usePasskeyManagement: () => ({
    passkeys: [
      { id: 'pk-1', name: 'MacBook Pro', createdAt: new Date('2025-01-01'), aaguid: null },
    ],
    isLoading: false,
    addPasskey: mockAddPasskey,
    deletePasskey: mockDeletePasskey,
  }),
}))

// passkey providers
vi.mock('@/lib/passkey-providers', () => ({
  getPasskeyProvider: () => ({ name: 'Unknown', icon: '?' }),
}))

// auth client
const mockSignOut = vi.fn()
const mockListAccounts = vi.fn().mockResolvedValue({ data: [] })
const mockUpdateUser = vi.fn().mockResolvedValue({})
const mockChangePassword = vi.fn().mockResolvedValue({})
vi.mock('@/lib/auth-client', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  authClient: {
    listAccounts: () => mockListAccounts(),
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    changePassword: (...args: unknown[]) => mockChangePassword(...args),
    passkey: {
      listUserPasskeys: vi.fn().mockResolvedValue({ data: [] }),
      addPasskey: vi.fn(),
      deletePasskey: vi.fn(),
    },
  },
}))

// UserAvatar — simple stub
vi.mock('@/components/user-avatar', () => ({
  UserAvatar: ({ email }: { email?: string }) => <div data-testid="user-avatar">{email}</div>,
}))

// react-easy-crop
vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete }: { onCropComplete: (a: unknown, b: unknown) => void }) => (
    <div data-testid="cropper" onClick={() => onCropComplete({}, { x: 0, y: 0, width: 100, height: 100 })} />
  ),
}))

// Drawer — pass-through
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="drawer">{children}</div> : null,
}))

import { SecurityDrawer } from './security-drawer'

// ─── Helpers ─────────────────────────────────────
const baseSession = {
  user: {
    email: 'test@example.com',
    role: 'user',
    image: null,
    name: 'TestUser',
    height: 175,
    reach: 180,
  },
}

function renderDrawer(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    session: baseSession,
    isAdmin: false,
    hasEditorAccess: false,
    onAvatarChange: vi.fn(),
    ...overrides,
  }
  return render(<SecurityDrawer {...defaultProps as React.ComponentProps<typeof SecurityDrawer>} />)
}

// ─── Tests ───────────────────────────────────────

describe('SecurityDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // listAccounts returns no password by default
    mockListAccounts.mockResolvedValue({ data: [] })
    // fetch mock for avatar / password API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as Mock
  })

  // ── Section 1: Basic Rendering ──
  describe('basic rendering', () => {
    it('renders email in the header', () => {
      renderDrawer()
      // Email appears in the glass-light header card
      const emailElements = screen.getAllByText('test@example.com')
      expect(emailElements.length).toBeGreaterThanOrEqual(1)
    })

    it('renders avatar section with camera overlay', () => {
      renderDrawer()
      expect(screen.getByTestId('user-avatar')).toBeTruthy()
    })

    it('renders profile fields with initial values', () => {
      renderDrawer()
      // Nickname input
      const nicknameInput = screen.getByPlaceholderText('nicknamePlaceholder')
      expect((nicknameInput as HTMLInputElement).value).toBe('TestUser')
    })

    it('renders passkey section with one passkey', () => {
      renderDrawer()
      expect(screen.getByText('MacBook Pro')).toBeTruthy()
    })

    it('renders logout button', () => {
      renderDrawer()
      expect(screen.getByText('logout')).toBeTruthy()
    })

    it('does not render when isOpen is false', () => {
      renderDrawer({ isOpen: false })
      expect(screen.queryByTestId('drawer')).not.toBeTruthy()
    })
  })

  // ── Section 2: Editor Access ──
  describe('editor access', () => {
    it('shows editor link when hasEditorAccess is true', () => {
      renderDrawer({ hasEditorAccess: true })
      expect(screen.getByText('editorEntry')).toBeTruthy()
    })

    it('hides editor link when hasEditorAccess is false', () => {
      renderDrawer({ hasEditorAccess: false })
      expect(screen.queryByText('editorEntry')).not.toBeTruthy()
    })
  })

  // ── Section 3: Profile Editing ──
  describe('profile editing', () => {
    it('computes ape index from height and reach', () => {
      renderDrawer()
      // reach(180) - height(175) = 5.0
      expect(screen.getByText('apeIndexPositive')).toBeTruthy()
    })

    it('does not show ape index when height or reach is empty', () => {
      renderDrawer({
        session: {
          user: { ...baseSession.user, height: undefined, reach: undefined },
        },
      })
      expect(screen.queryByText('apeIndex')).not.toBeTruthy()
    })

    it('calls updateUser with profile data on save', async () => {
      const { user } = renderDrawer()
      const saveButton = screen.getByText('saveProfile')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'TestUser',
            height: 175,
            reach: 180,
          })
        )
      })
    })

    it('shows success toast after saving profile', async () => {
      const { user } = renderDrawer()
      await user.click(screen.getByText('saveProfile'))

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('profileSaved', 'success')
      })
    })

    it('shows error toast when save fails', async () => {
      mockUpdateUser.mockRejectedValueOnce(new Error('fail'))
      const { user } = renderDrawer()
      await user.click(screen.getByText('saveProfile'))

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('profileSaveFailed', 'error')
      })
    })
  })

  // ── Section 4: Password Management ──
  describe('password management', () => {
    it('shows "set password" when user has no password', async () => {
      mockListAccounts.mockResolvedValue({ data: [] })
      renderDrawer()
      await waitFor(() => {
        expect(screen.getByText('noPassword')).toBeTruthy()
      })
    })

    it('shows "has password" when user has credential account', async () => {
      mockListAccounts.mockResolvedValue({
        data: [{ providerId: 'credential' }],
      })
      renderDrawer()
      await waitFor(() => {
        expect(screen.getByText('hasPassword')).toBeTruthy()
      })
    })

    it('expands password form on click', async () => {
      const { user } = renderDrawer()
      await waitFor(() => {
        expect(screen.getByText('setPassword')).toBeTruthy()
      })
      await user.click(screen.getByText('setPassword'))
      // Should now show password input fields
      expect(screen.getByPlaceholderText('newPassword')).toBeTruthy()
      expect(screen.getByPlaceholderText('confirmPassword')).toBeTruthy()
    })

    it('validates password length (min 4)', async () => {
      const { user } = renderDrawer()
      await waitFor(() => screen.getByText('setPassword'))
      // Expand
      await user.click(screen.getByText('setPassword'))

      // Type short password
      const newPwInput = screen.getByPlaceholderText('newPassword')
      const confirmPwInput = screen.getByPlaceholderText('confirmPassword')
      fireEvent.change(newPwInput, { target: { value: '12' } })
      fireEvent.change(confirmPwInput, { target: { value: '12' } })

      // Find the set password button in the expanded form (not the toggle)
      const buttons = screen.getAllByText('setPassword')
      const submitButton = buttons[buttons.length - 1]
      await user.click(submitButton)

      expect(mockShowToast).toHaveBeenCalledWith('passwordTooShort', 'error')
    })

    it('validates password mismatch', async () => {
      const { user } = renderDrawer()
      await waitFor(() => screen.getByText('setPassword'))
      await user.click(screen.getByText('setPassword'))

      const newPwInput = screen.getByPlaceholderText('newPassword')
      const confirmPwInput = screen.getByPlaceholderText('confirmPassword')
      fireEvent.change(newPwInput, { target: { value: 'password1' } })
      fireEvent.change(confirmPwInput, { target: { value: 'password2' } })

      const buttons = screen.getAllByText('setPassword')
      await user.click(buttons[buttons.length - 1])

      expect(mockShowToast).toHaveBeenCalledWith('passwordMismatch', 'error')
    })

    it('calls set-password API with valid password', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { user } = renderDrawer()
      await waitFor(() => screen.getByText('setPassword'))
      await user.click(screen.getByText('setPassword'))

      const newPwInput = screen.getByPlaceholderText('newPassword')
      const confirmPwInput = screen.getByPlaceholderText('confirmPassword')
      fireEvent.change(newPwInput, { target: { value: 'validpass' } })
      fireEvent.change(confirmPwInput, { target: { value: 'validpass' } })

      const buttons = screen.getAllByText('setPassword')
      await user.click(buttons[buttons.length - 1])

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/set-password',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ newPassword: 'validpass' }),
          })
        )
      })
    })

    it('collapses form and clears fields after cancel', async () => {
      const { user } = renderDrawer()
      await waitFor(() => screen.getByText('setPassword'))
      await user.click(screen.getByText('setPassword'))

      // Type something
      fireEvent.change(screen.getByPlaceholderText('newPassword'), { target: { value: 'test' } })

      // Cancel
      await user.click(screen.getByText('cancel'))

      // Form should be collapsed (no password inputs)
      expect(screen.queryByPlaceholderText('newPassword')).not.toBeTruthy()
    })
  })

  // ── Section 5: Passkey Management ──
  describe('passkey management', () => {
    it('displays passkey list', () => {
      renderDrawer()
      expect(screen.getByText('MacBook Pro')).toBeTruthy()
    })

    it('calls addPasskey when "add device" is clicked', async () => {
      mockAddPasskey.mockResolvedValue({})
      const { user } = renderDrawer()
      await user.click(screen.getByText(/addDevice/))

      expect(mockAddPasskey).toHaveBeenCalled()
    })

    it('shows toast on addPasskey success', async () => {
      mockAddPasskey.mockResolvedValue({})
      const { user } = renderDrawer()
      await user.click(screen.getByText(/addDevice/))

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('passkeyAdded', 'success')
      })
    })

    it('shows toast on addPasskey error', async () => {
      mockAddPasskey.mockResolvedValue({ error: 'fail' })
      const { user } = renderDrawer()
      await user.click(screen.getByText(/addDevice/))

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('passkeyFailed', 'error')
      })
    })

    it('calls deletePasskey with correct id', async () => {
      mockDeletePasskey.mockResolvedValue(undefined)
      renderDrawer()
      // The passkey card uses glass-light class; find the card containing "MacBook Pro"
      // then locate the delete button (Trash2) which is a sibling button with error color
      const passkeyCard = screen.getByText('MacBook Pro').closest('.glass-light')!
      const deleteBtn = within(passkeyCard as HTMLElement).getByRole('button')
      fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(mockDeletePasskey).toHaveBeenCalledWith('pk-1')
      })
    })
  })

  // ── Section 6: Avatar ──
  describe('avatar management', () => {
    it('shows delete avatar option when user has an image', () => {
      renderDrawer({
        session: { user: { ...baseSession.user, image: 'https://example.com/avatar.jpg' } },
      })
      expect(screen.getByText('avatarRemove')).toBeTruthy()
    })

    it('does not show delete avatar option when user has no image', () => {
      renderDrawer()
      expect(screen.queryByText('avatarRemove')).not.toBeTruthy()
    })

    it('calls delete avatar API and notifies parent', async () => {
      const onAvatarChange = vi.fn();
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { user } = renderDrawer({
        session: { user: { ...baseSession.user, image: 'https://example.com/avatar.jpg' } },
        onAvatarChange,
      })

      await user.click(screen.getByText('avatarRemove'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/avatar', { method: 'DELETE' })
        expect(onAvatarChange).toHaveBeenCalledWith(null)
        expect(mockShowToast).toHaveBeenCalledWith('avatarDeleted', 'success')
      })
    })
  })

  // ── Section 7: Logout ──
  describe('logout', () => {
    it('calls signOut and closes drawer on logout', async () => {
      mockSignOut.mockResolvedValue(undefined)
      const onClose = vi.fn()
      const { user } = renderDrawer({ onClose })

      await user.click(screen.getByText('logout'))

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
        expect(mockShowToast).toHaveBeenCalledWith('logout', 'success')
      })
    })
  })
})
