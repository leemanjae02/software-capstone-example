/**
 * SSR + Express Mock Server 테스트 페이지 (/ssr-test)
 *
 * ── 왜 msw/node가 아니라 Express인가? ──────────────────────────────────────
 * Next.js 16은 Node.js 18+의 undici 기반 fetch를 사용합니다.
 * undici는 http/https 모듈을 우회해 TCP 소켓으로 직접 통신하기 때문에
 * msw/node의 인터셉터(http 모듈 패치)가 동작하지 않습니다.
 *
 * 해결책: 별도 Express 서버(port 9090)를 띄우고 절대 URL로 fetch합니다.
 * Express는 Node.js http 모듈 기반이므로 정상 동작합니다.
 *
 * ── 실행 방법 ───────────────────────────────────────────────────────────────
 * npm run dev:full   →  Next.js(3000) + Express mock server(9090) 동시 실행
 * npm run mock       →  Express mock server만 실행
 *
 * ── 흐름 ────────────────────────────────────────────────────────────────────
 * 브라우저 → Next.js 서버(3000) → SSR 렌더링 중 fetch → Express mock(9090)
 *                                                        ↑ 여기서 가짜 응답
 */

type User = { id: string; name: string; email: string }

/**
 * Express mock server에서 유저 목록을 가져옵니다.
 * cache: 'no-store' — 매 요청마다 새로 fetch합니다 (캐시 비활성화).
 */
async function getUsers(): Promise<User[]> {
  const base = process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:9090'
  const res = await fetch(`${base}/api/users`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`mock server 응답 오류: ${res.status}`)
  return res.json()
}

/**
 * async 서버 컴포넌트 — 이 컴포넌트는 브라우저가 아닌 Next.js 서버에서 실행됩니다.
 * await fetch()가 서버에서 호출되므로 SSR 모킹 여부를 직접 확인할 수 있습니다.
 */
export default async function SSRTestPage() {
  let users: User[] = []
  let error: string | null = null

  try {
    users = await getUsers()
  } catch (e) {
    error = e instanceof Error ? e.message : '알 수 없는 오류'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-mono">
      <h1 className="text-2xl font-bold mb-1">SSR + Express Mock Server 테스트</h1>
      <p className="text-gray-400 text-sm mb-1">
        이 페이지는 <strong>서버</strong>에서 렌더링됩니다.
        (Next.js 서버 컴포넌트 — 브라우저 JS 없음)
      </p>
      <p className="text-gray-500 text-xs mb-6">
        DevTools → Network에서 이 페이지의 HTML 요청만 보이고
        /api/users 요청은 보이지 않습니다. SSR이기 때문입니다.
      </p>

      {error ? (
        <div className="bg-red-900/40 border border-red-700 rounded p-4 text-red-300">
          <p className="font-bold mb-1">Express mock server 연결 실패</p>
          <p className="text-sm mb-2">{error}</p>
          <p className="text-xs text-red-400">
            → <code>npm run mock</code> 또는 <code>npm run dev:full</code> 로
            Express mock server(9090)를 먼저 실행해주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-green-400 text-sm mb-4">
            ✅ SSR에서 Express mock server 데이터 수신 성공 (총 {users.length}명)
          </p>
          {users.map((user) => (
            <div key={user.id} className="bg-gray-800 rounded p-4 text-sm flex gap-4">
              <span className="text-gray-500">#{user.id}</span>
              <span className="font-semibold">{user.name}</span>
              <span className="text-gray-400">{user.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
