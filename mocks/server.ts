/**
 * Express Mock Server
 *
 * Next.js 16은 undici 기반 fetch를 사용해 msw/node의 http 인터셉터를 우회합니다.
 * 따라서 SSR(서버 컴포넌트, API Routes)에서 msw/node로는 모킹이 불가합니다.
 * 이 서버는 그 대안으로 절대 URL(http://localhost:9090)로 모킹을 제공합니다.
 *
 * 실행: npm run mock          (Express만)
 *       npm run dev:full      (Next.js + Express 동시)
 *
 * 포트: 9090 (고정)
 *
 * 라우트 구조:
 *   mocks/
 *   ├── data/users.ts      ← User 타입 + 인메모리 데이터
 *   ├── handlers/users.ts  ← Express Router (HTTP 메서드별 라우트)
 *   └── server.ts          ← 앱 설정 + 서버 시작 (이 파일)
 */

import express from 'express'
import cors from 'cors'
import userRouter from './handlers/users'

const app = express()

// CORS: 모든 origin에서의 요청을 허용합니다.
// Next.js 개발 서버(3000)를 포함해 어떤 포트에서 요청해도 브라우저 정책 오류가 발생하지 않습니다.
app.use(cors({ origin: '*' }))

// JSON 바디 파싱: req.body로 JSON 요청 본문을 읽을 수 있게 합니다.
app.use(express.json())

// /api/users 경로 이하를 userRouter에 위임합니다.
app.use('/api/users', userRouter)

const PORT = 9090

app.listen(PORT, () => {
  console.log(`[Mock Server] http://localhost:${PORT}`)
  console.log('  GET    /api/users')
  console.log('  GET    /api/users/:id')
  console.log('  POST   /api/users')
  console.log('  PUT    /api/users/:id  (전체 교체)')
  console.log('  PATCH  /api/users/:id  (부분 수정)')
  console.log('  DELETE /api/users/:id')
  console.log('  POST   /api/users/reset')
})
