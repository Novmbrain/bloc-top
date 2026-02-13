import { vi, describe, it, expect } from 'vitest'

// Mock mongodb to avoid MONGODB_URI requirement in test environment
vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(),
}))

import { ac, roles, canCreateCrag } from './permissions'

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
})
