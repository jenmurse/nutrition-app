import { NextResponse } from 'next/server'

jest.mock('@/lib/auth', () => ({
  getAuthenticatedHousehold: jest.fn(),
}))

import { withAuth } from '@/lib/apiUtils'
import { getAuthenticatedHousehold } from '@/lib/auth'

const mockAuth = { personId: 1, supabaseId: 'uuid', householdId: 1, role: 'owner' }

describe('withAuth', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls handler with auth and passes through args', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue(mockAuth)
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }))

    const wrapped = withAuth(handler, 'Failed')
    const request = new Request('http://localhost:3000')
    await wrapped(request)

    expect(handler).toHaveBeenCalledWith(mockAuth, request)
  })

  it('returns auth error response when unauthenticated', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue({ error: 'Unauthorized', status: 401 })
    const handler = jest.fn()

    const wrapped = withAuth(handler, 'Failed')
    const response = await wrapped(new Request('http://localhost:3000'))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 for no-household error', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue({ error: 'No household found', status: 403 })

    const wrapped = withAuth(jest.fn(), 'Failed')
    const response = await wrapped(new Request('http://localhost:3000'))

    expect(response.status).toBe(403)
  })

  it('catches handler errors and returns fallback error', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue(mockAuth)
    const handler = jest.fn().mockRejectedValue(new Error('DB exploded'))

    const wrapped = withAuth(handler, 'Failed to fetch things')
    const response = await wrapped(new Request('http://localhost:3000'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch things' })
  })

  it('uses default fallback error when none provided', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue(mockAuth)
    const handler = jest.fn().mockRejectedValue(new Error('oops'))

    const response = await withAuth(handler)(new Request('http://localhost:3000'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Internal server error' })
  })

  it('passes handler response through unchanged', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue(mockAuth)
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ id: 42 }, { status: 201 }))

    const response = await withAuth(handler, 'Failed')(new Request('http://localhost:3000'))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ id: 42 })
  })

  it('forwards multiple args to handler', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue(mockAuth)
    const handler = jest.fn().mockResolvedValue(NextResponse.json({}))

    const request = new Request('http://localhost:3000')
    const ctx = { params: Promise.resolve({ id: '5' }) }
    await withAuth(handler, 'Failed')(request, ctx)

    expect(handler).toHaveBeenCalledWith(mockAuth, request, ctx)
  })

  it('does not invoke fallback when handler catches its own error', async () => {
    ;(getAuthenticatedHousehold as jest.Mock).mockResolvedValue(mockAuth)
    const handler = jest.fn().mockImplementation(async () => {
      try {
        throw new Error('internal')
      } catch (e) {
        return NextResponse.json({ error: 'Custom: internal' }, { status: 500 })
      }
    })

    const response = await withAuth(handler, 'Should not appear')(new Request('http://localhost:3000'))
    const data = await response.json()

    expect(data.error).toBe('Custom: internal')
  })
})
