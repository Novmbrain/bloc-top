import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock mongodb to avoid MONGODB_URI requirement in test environment
const mockFindOne = vi.fn()
const mockFind = vi.fn()
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  find: mockFind,
}))
const mockDb = { collection: mockCollection }

vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb)),
}))

import {
  ac,
  roles,
  canCreateCrag,
  canEditCrag,
  canDeleteCrag,
  canManagePermissions,
  canAccessEditor,
  getEditableCragIds,
} from './permissions'

beforeEach(() => {
  vi.clearAllMocks()
  mockCollection.mockReturnValue({
    findOne: mockFindOne,
    find: mockFind,
  })
})

describe('permissions', () => {
  describe('AC definitions', () => {
    it('should export ac with custom statements', () => {
      expect(ac).toBeDefined()
      expect(ac.statements).toBeDefined()
      expect(ac.statements.editor).toEqual(['access'])
      expect(ac.statements.crag).toEqual(['create', 'update', 'delete'])
      expect(ac.statements.route).toEqual(['create', 'update', 'delete'])
      expect(ac.statements.face).toEqual(['upload', 'rename', 'delete'])
      expect(ac.statements.beta).toEqual(['approve', 'delete'])
      // inherited from defaultStatements
      expect(ac.statements.user).toBeDefined()
      expect(ac.statements.session).toBeDefined()
    })

    it('should export roles for admin, crag_creator, and user', () => {
      expect(roles.admin).toBeDefined()
      expect(roles.crag_creator).toBeDefined()
      expect(roles.user).toBeDefined()
    })
  })

  describe('canCreateCrag', () => {
    it('should allow admin to create crags', () => {
      expect(canCreateCrag('admin')).toBe(true)
    })

    it('should allow crag_creator to create crags', () => {
      expect(canCreateCrag('crag_creator')).toBe(true)
    })

    it('should deny regular user from creating crags', () => {
      expect(canCreateCrag('user')).toBe(false)
    })
  })

  // ============ S1: 异步权限函数测试 ============

  describe('canEditCrag', () => {
    it('should allow admin without DB query', async () => {
      const result = await canEditCrag('user1', 'crag1', 'admin')
      expect(result).toBe(true)
      expect(mockCollection).not.toHaveBeenCalled()
    })

    it('should allow user with crag_permission', async () => {
      mockFindOne.mockResolvedValueOnce({ userId: 'user1', cragId: 'crag1', role: 'manager' })
      const result = await canEditCrag('user1', 'crag1', 'user')
      expect(result).toBe(true)
      expect(mockCollection).toHaveBeenCalledWith('crag_permissions')
      expect(mockFindOne).toHaveBeenCalledWith({ userId: 'user1', cragId: 'crag1' })
    })

    it('should fallback to createdBy when no permission record', async () => {
      // First findOne (crag_permissions) returns null
      mockFindOne.mockResolvedValueOnce(null)
      // Second findOne (crags) returns a match
      mockFindOne.mockResolvedValueOnce({ _id: 'abc' })

      const result = await canEditCrag('user1', 'crag1', 'crag_creator')
      expect(result).toBe(true)
      // Should query both collections
      expect(mockCollection).toHaveBeenCalledWith('crag_permissions')
      expect(mockCollection).toHaveBeenCalledWith('crags')
    })

    it('should deny user without permission or createdBy', async () => {
      mockFindOne.mockResolvedValueOnce(null) // crag_permissions
      mockFindOne.mockResolvedValueOnce(null) // crags createdBy

      const result = await canEditCrag('user1', 'crag1', 'user')
      expect(result).toBe(false)
    })
  })

  describe('canDeleteCrag', () => {
    it('should allow admin without DB query', async () => {
      const result = await canDeleteCrag('user1', 'crag1', 'admin')
      expect(result).toBe(true)
      expect(mockCollection).not.toHaveBeenCalled()
    })

    it('should allow creator to delete', async () => {
      mockFindOne.mockResolvedValueOnce({ userId: 'user1', cragId: 'crag1', role: 'creator' })
      const result = await canDeleteCrag('user1', 'crag1', 'crag_creator')
      expect(result).toBe(true)
      expect(mockFindOne).toHaveBeenCalledWith({ userId: 'user1', cragId: 'crag1', role: 'creator' })
    })

    it('should deny manager from deleting', async () => {
      mockFindOne.mockResolvedValueOnce(null) // no creator role
      const result = await canDeleteCrag('user1', 'crag1', 'user')
      expect(result).toBe(false)
    })
  })

  describe('canManagePermissions', () => {
    it('should allow admin without DB query', async () => {
      const result = await canManagePermissions('user1', 'crag1', 'admin')
      expect(result).toBe(true)
      expect(mockCollection).not.toHaveBeenCalled()
    })

    it('should allow creator to manage permissions', async () => {
      mockFindOne.mockResolvedValueOnce({ userId: 'user1', cragId: 'crag1', role: 'creator' })
      const result = await canManagePermissions('user1', 'crag1', 'crag_creator')
      expect(result).toBe(true)
      expect(mockFindOne).toHaveBeenCalledWith({ userId: 'user1', cragId: 'crag1', role: 'creator' })
    })

    it('should deny manager from managing permissions', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const result = await canManagePermissions('user1', 'crag1', 'user')
      expect(result).toBe(false)
    })
  })

  describe('canAccessEditor', () => {
    it('should allow admin without DB query', async () => {
      const result = await canAccessEditor('user1', 'admin')
      expect(result).toBe(true)
      expect(mockCollection).not.toHaveBeenCalled()
    })

    it('should allow crag_creator without DB query', async () => {
      const result = await canAccessEditor('user1', 'crag_creator')
      expect(result).toBe(true)
      expect(mockCollection).not.toHaveBeenCalled()
    })

    it('should allow user with any crag_permission', async () => {
      mockFindOne.mockResolvedValueOnce({ userId: 'user1', cragId: 'crag1', role: 'manager' })
      const result = await canAccessEditor('user1', 'user')
      expect(result).toBe(true)
      expect(mockFindOne).toHaveBeenCalledWith({ userId: 'user1' })
    })

    it('should deny user without any crag_permission', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const result = await canAccessEditor('user1', 'user')
      expect(result).toBe(false)
    })
  })

  describe('getEditableCragIds', () => {
    it('should return "all" for admin', async () => {
      const result = await getEditableCragIds('user1', 'admin')
      expect(result).toBe('all')
      expect(mockCollection).not.toHaveBeenCalled()
    })

    it('should return cragIds for user with permissions', async () => {
      mockFind.mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValueOnce([
          { userId: 'user1', cragId: 'crag1', role: 'creator' },
          { userId: 'user1', cragId: 'crag2', role: 'manager' },
        ]),
      })
      const result = await getEditableCragIds('user1', 'crag_creator')
      expect(result).toEqual(['crag1', 'crag2'])
    })

    it('should return empty array for user without permissions', async () => {
      mockFind.mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValueOnce([]),
      })
      const result = await getEditableCragIds('user1', 'user')
      expect(result).toEqual([])
    })
  })
})
