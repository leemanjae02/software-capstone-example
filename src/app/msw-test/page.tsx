/**
 * CSR CRUD 게시판 (/msw-test)
 *
 * MSW(Mock Service Worker)로 인메모리 데이터를 관리하는 CRUD 데모입니다.
 * 실제 서버 없이 브라우저에서 HTTP 메서드 전체를 체험할 수 있습니다.
 *
 * HTTP 메서드 활용:
 *   GET    — 목록/단건 조회
 *   POST   — 새 유저 추가 (201 Created)
 *   PUT    — 행 전체 교체 (name + email 모두 필수)
 *   PATCH  — 행 부분 수정 (변경 필드만 전송)
 *   DELETE — 행 삭제 (204 No Content)
 */

'use client'

import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { useEffect, useRef, useState } from 'react'

// ── 타입 ──────────────────────────────────────────────────────────────────────

type User = { id: string; name: string; email: string }

// ── 인메모리 목 데이터 ────────────────────────────────────────────────────────

const db: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Carol', email: 'carol@example.com' },
]

const INITIAL_DB: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Carol', email: 'carol@example.com' },
]

// ── MSW 핸들러 ────────────────────────────────────────────────────────────────

const handlers = [
  http.get('/api/users', () => HttpResponse.json(db)),

  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as Omit<User, 'id'>
    const newUser: User = { id: String(Date.now()), ...body }
    db.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),

  // PUT: 전체 교체 — name, email 모두 새 값으로 덮어씁니다.
  http.put('/api/users/:id', async ({ request, params }) => {
    const id = String(params.id)
    const idx = db.findIndex((u) => u.id === id)
    if (idx === -1) return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
    const body = (await request.json()) as Omit<User, 'id'>
    db[idx] = { id, ...body }
    return HttpResponse.json(db[idx])
  }),

  // PATCH: 부분 수정 — 보낸 필드만 바꾸고 나머지는 유지합니다.
  http.patch('/api/users/:id', async ({ request, params }) => {
    const id = String(params.id)
    const idx = db.findIndex((u) => u.id === id)
    if (idx === -1) return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
    const body = (await request.json()) as Partial<User>
    db[idx] = { ...db[idx], ...body }
    return HttpResponse.json(db[idx])
  }),

  // DELETE: 삭제 — 204 No Content (응답 바디 없음)
  http.delete('/api/users/:id', ({ params }) => {
    const id = String(params.id)
    const idx = db.findIndex((u) => u.id === id)
    if (idx === -1) return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
    db.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // RESET: 인메모리 db를 초기 데이터로 복원합니다.
  // 컴포넌트에서 직접 db를 splice하면 HMR(핫 리로드) 시
  // 핸들러 클로저와 컴포넌트가 서로 다른 db를 참조할 수 있습니다.
  // MSW 핸들러를 통해 처리하면 항상 같은 db를 공유합니다.
  http.post('/api/users/reset', () => {
    db.splice(0, db.length, ...INITIAL_DB)
    return HttpResponse.json(db)
  }),
]

// ── API 헬퍼 ─────────────────────────────────────────────────────────────────

const api = {
  list: (): Promise<User[]> => fetch('/api/users').then((r) => r.json()),

  create: (name: string, email: string): Promise<User> =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    }).then((r) => r.json()),

  // PUT: 모든 필드를 새 값으로 완전 교체
  replace: (id: string, name: string, email: string): Promise<User> =>
    fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    }).then((r) => r.json()),

  // PATCH: 변경된 필드만 전송
  patch: (id: string, fields: Partial<Omit<User, 'id'>>): Promise<User> =>
    fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).then((r) => r.json()),

  remove: (id: string): Promise<void> =>
    fetch(`/api/users/${id}`, { method: 'DELETE' }).then(() => undefined),

  reset: (): Promise<User[]> =>
    fetch('/api/users/reset', { method: 'POST' }).then((r) => r.json()),
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function MSWTestPage() {
  const [ready, setReady] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [status, setStatus] = useState<{ method: string; msg: string } | null>(null)

  // 인라인 편집 상태: null이면 편집 중 아님, string이면 해당 id 행이 편집 모드
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  // PUT(전체교체) vs PATCH(부분수정) 선택
  const [editMethod, setEditMethod] = useState<'PUT' | 'PATCH'>('PATCH')

  // 새 유저 추가 폼 상태
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const workerRef = useRef<ReturnType<typeof setupWorker> | null>(null)

  // Service Worker 초기화 — start()가 끝난 뒤에만 fetch가 인터셉트됩니다.
  useEffect(() => {
    const worker = setupWorker(...handlers)
    workerRef.current = worker
    worker.start({ onUnhandledRequest: 'bypass' }).then(async () => {
      setReady(true)
      setUsers(await api.list())
    })
    return () => worker.stop()
  }, [])

  const notify = (method: string, msg: string) => setStatus({ method, msg })
  const reload = async () => setUsers(await api.list())

  // ── 핸들러 ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim()) return
    const created = await api.create(newName.trim(), newEmail.trim())
    notify('POST', `201 Created — id: ${created.id}`)
    setNewName('')
    setNewEmail('')
    await reload()
  }

  const startEdit = (user: User) => {
    setEditId(user.id)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditMethod('PATCH')
  }

  const handleSave = async () => {
    if (!editId) return

    if (editMethod === 'PUT') {
      // PUT: name과 email 모두 새 값으로 전체 교체합니다.
      const updated = await api.replace(editId, editName, editEmail)
      notify('PUT', `전체 교체 → ${updated.name} / ${updated.email}`)
    } else {
      // PATCH: 변경된 필드만 추려서 보냅니다.
      const original = users.find((u) => u.id === editId)!
      const fields: Partial<Omit<User, 'id'>> = {}
      if (editName !== original.name) fields.name = editName
      if (editEmail !== original.email) fields.email = editEmail
      if (Object.keys(fields).length === 0) {
        notify('PATCH', '변경 사항 없음')
        setEditId(null)
        return
      }
      const updated = await api.patch(editId, fields)
      notify('PATCH', `부분 수정 (${Object.keys(fields).join(', ')}) → ${updated.name} / ${updated.email}`)
    }

    setEditId(null)
    await reload()
  }

  const handleDelete = async (user: User) => {
    await api.remove(user.id)
    notify('DELETE', `204 No Content — "${user.name}" 삭제됨`)
    await reload()
  }

  const handleReset = async () => {
    await api.reset()
    notify('RESET', '초기 데이터로 복원')
    await reload()
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  const methodColor: Record<string, string> = {
    POST: 'bg-green-700',
    PUT: 'bg-yellow-600',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-600',
    RESET: 'bg-gray-500',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-mono max-w-3xl mx-auto">

      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">MSW CRUD 게시판 (CSR)</h1>
        <p className="text-gray-400 text-sm mt-1">
          {ready ? '✅ 준비 완료' : '⏳ 초기화 중…'}
        </p>
      </div>

      {/* 상태 배지 */}
      {status && (
        <div className={`mb-4 px-4 py-2 rounded text-sm font-semibold ${methodColor[status.method] ?? 'bg-gray-700'}`}>
          [{status.method}] {status.msg}
        </div>
      )}

      {/* 유저 목록 테이블 */}
      <div className="mb-6 border border-gray-700 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left w-12">ID</th>
              <th className="px-4 py-2 text-left">이름</th>
              <th className="px-4 py-2 text-left">이메일</th>
              <th className="px-4 py-2 text-right w-48">작업</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  {ready ? '데이터 없음' : '불러오는 중…'}
                </td>
              </tr>
            )}
            {users.map((user) =>
              editId === user.id ? (
                /* 편집 행 */
                <tr key={user.id} className="bg-gray-800 border-t border-gray-700">
                  <td className="px-4 py-2 text-gray-400">{user.id}</td>
                  <td className="px-4 py-2">
                    <input
                      className="bg-gray-700 rounded px-2 py-1 w-full text-white text-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="bg-gray-700 rounded px-2 py-1 w-full text-white text-sm"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right space-x-1">
                    {/* PUT/PATCH 선택 토글 */}
                    <select
                      className="bg-gray-700 text-gray-200 text-xs rounded px-1 py-1 mr-1"
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value as 'PUT' | 'PATCH')}
                    >
                      <option value="PATCH">PATCH (부분)</option>
                      <option value="PUT">PUT (전체)</option>
                    </select>
                    <button
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded cursor-pointer"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1 rounded cursor-pointer"
                    >
                      취소
                    </button>
                  </td>
                </tr>
              ) : (
                /* 일반 행 */
                <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-900 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{user.id}</td>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3 text-gray-300">{user.email}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => startEdit(user)}
                      disabled={!ready}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1 rounded disabled:opacity-40 cursor-pointer"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={!ready}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded disabled:opacity-40 cursor-pointer"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* 새 유저 추가 폼 */}
      <div className="mb-4 p-4 bg-gray-900 border border-gray-700 rounded">
        <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">POST — 새 유저 추가</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
            placeholder="이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
            placeholder="이메일"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!ready || !newName.trim() || !newEmail.trim()}
            className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded disabled:opacity-40 cursor-pointer"
          >
            추가
          </button>
        </div>
      </div>

      {/* 초기화 버튼 */}
      <button
        onClick={handleReset}
        disabled={!ready}
        className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-2 rounded disabled:opacity-40 cursor-pointer"
      >
        초기화 (Alice / Bob / Carol 복원)
      </button>
    </div>
  )
}
