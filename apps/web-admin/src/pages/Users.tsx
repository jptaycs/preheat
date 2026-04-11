import type { FormEvent } from 'react'
import React, { useEffect, useState } from 'react'
import type { User } from '../lib/api'
import { adminApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

const ROLES = ['pilot', 'dispatcher', 'admin']

// ── Add User modal ─────────────────────────────────────────────────────────

interface AddUserModalProps {
  onClose: () => void
  onCreated: (user: User) => void
}

function AddUserModal({ onClose, onCreated }: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('pilot')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await adminApi.createUser({ name, email, password, role })
      onCreated(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.s2,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    fontSize: theme.fontSizes.sm,
    outline: 'none',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: theme.spacing.lg,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: theme.colors.s1,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          width: '100%',
          maxWidth: 440,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <h2 style={{ fontSize: theme.fontSizes.lg, fontWeight: 700, color: theme.colors.text }}>
            Add User
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.t2,
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
        >
          <Field label="Name">
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />
          </Field>
          <Field label="Role">
            <select
              style={{ ...inputStyle }}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={{ background: theme.colors.s1 }}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <div
              style={{
                background: `${theme.colors.red}22`,
                border: `1px solid ${theme.colors.red}44`,
                borderRadius: theme.radius.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: theme.colors.red,
                fontSize: theme.fontSizes.sm,
                marginBottom: theme.spacing.md,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                background: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.t2,
                fontSize: theme.fontSizes.sm,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                background: busy ? theme.colors.t3 : theme.colors.blue,
                border: 'none',
                borderRadius: theme.radius.md,
                color: '#fff',
                fontSize: theme.fontSizes.sm,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      <label
        style={{
          display: 'block',
          fontSize: theme.fontSizes.xs,
          color: theme.colors.t2,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: theme.spacing.xs,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Delete confirm dialog ──────────────────────────────────────────────────

interface DeleteConfirmProps {
  user: User
  onCancel: () => void
  onConfirm: () => void
  busy: boolean
}

function DeleteConfirm({ user, onCancel, onConfirm, busy }: DeleteConfirmProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: theme.spacing.lg,
      }}
    >
      <div
        style={{
          background: theme.colors.s1,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          maxWidth: 400,
          width: '100%',
        }}
      >
        <h2
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: 700,
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Delete User
        </h2>
        <p
          style={{
            color: theme.colors.t2,
            fontSize: theme.fontSizes.sm,
            marginBottom: theme.spacing.xl,
          }}
        >
          Are you sure you want to delete{' '}
          <strong style={{ color: theme.colors.text }}>{user.name}</strong> ({user.email})? This
          action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              background: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              color: theme.colors.t2,
              fontSize: theme.fontSizes.sm,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              background: busy ? theme.colors.t3 : theme.colors.red,
              border: 'none',
              borderRadius: theme.radius.md,
              color: '#fff',
              fontSize: theme.fontSizes.sm,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [roleUpdateBusy, setRoleUpdateBusy] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const list = await adminApi.getUsers()
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleUpdateBusy(userId)
    try {
      const updated = await adminApi.updateRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setRoleUpdateBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await adminApi.deleteUser(deleteTarget.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div style={{ padding: theme.spacing.xl }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xl,
        }}
      >
        <div>
          <h1 style={{ fontSize: theme.fontSizes.xl, fontWeight: 700, color: theme.colors.text }}>
            Users
          </h1>
          <p style={{ fontSize: theme.fontSizes.sm, color: theme.colors.t2, marginTop: 4 }}>
            Manage accounts and roles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            background: theme.colors.blue,
            border: 'none',
            borderRadius: theme.radius.md,
            color: '#fff',
            fontSize: theme.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add User
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: `${theme.colors.red}22`,
            border: `1px solid ${theme.colors.red}44`,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            color: theme.colors.red,
            marginBottom: theme.spacing.lg,
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: theme.colors.s1,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
              {['Name', 'Email', 'Role', 'License #', 'Joined', 'Actions'].map((col) => (
                <th key={col} style={thStyle}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={emptyTdStyle}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} style={emptyTdStyle}>
                  No users found.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u, i) => {
                const isSelf = u.id === currentUser?.id
                const isRoleBusy = roleUpdateBusy === u.id

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom:
                        i < users.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                      background: i % 2 === 1 ? `${theme.colors.s2}60` : 'transparent',
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: theme.colors.text }}>{u.name}</div>
                      {isSelf && (
                        <span
                          style={{
                            fontSize: theme.fontSizes.xs,
                            color: theme.colors.blue,
                            fontWeight: 600,
                          }}
                        >
                          You
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: theme.colors.t2 }}>{u.email}</td>
                    <td style={tdStyle}>
                      <select
                        value={u.role}
                        disabled={isRoleBusy || isSelf}
                        onChange={(e) => {
                          void handleRoleChange(u.id, e.target.value)
                        }}
                        style={{
                          padding: '4px 8px',
                          background: theme.colors.s2,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radius.sm,
                          color: isSelf ? theme.colors.t2 : theme.colors.text,
                          fontSize: theme.fontSizes.xs,
                          cursor: isSelf ? 'not-allowed' : 'pointer',
                          opacity: isRoleBusy ? 0.5 : 1,
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} style={{ background: theme.colors.s1 }}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, color: theme.colors.t2, fontFamily: 'monospace' }}>
                      {u.licenseNumber ?? '—'}
                    </td>
                    <td
                      style={{ ...tdStyle, color: theme.colors.t2, fontSize: theme.fontSizes.xs }}
                    >
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={tdStyle}>
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          style={{
                            padding: '4px 12px',
                            background: 'transparent',
                            border: `1px solid ${theme.colors.red}44`,
                            borderRadius: theme.radius.sm,
                            color: theme.colors.red,
                            fontSize: theme.fontSizes.xs,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: theme.spacing.sm,
          fontSize: theme.fontSizes.xs,
          color: theme.colors.t3,
        }}
      >
        {users.length} user{users.length !== 1 ? 's' : ''} total. You cannot delete your own
        account.
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={(u) => setUsers((prev) => [...prev, u])}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            void handleDelete()
          }}
          busy={deleteBusy}
        />
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  textAlign: 'left',
  fontSize: theme.fontSizes.xs,
  color: theme.colors.t2,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  fontSize: theme.fontSizes.sm,
  color: theme.colors.text,
  verticalAlign: 'middle',
}

const emptyTdStyle: React.CSSProperties = {
  padding: theme.spacing.xl,
  textAlign: 'center',
  color: theme.colors.t2,
  fontSize: theme.fontSizes.sm,
}
