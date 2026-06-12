/**
 * Users API 라우트 핸들러
 *
 * Express Router로 /api/users 하위 경로를 담당합니다.
 * server.ts에서 app.use('/api/users', userRouter)로 마운트되므로
 * 이 파일 안의 경로는 /api/users 이후 부분만 작성합니다.
 *   예) router.get('/')     → GET  /api/users
 *       router.get('/:id')  → GET  /api/users/:id
 *
 * HTTP 메서드별 역할:
 *   GET    — 데이터 조회 (목록 또는 단건)
 *   POST   — 새 리소스 생성 → 201 Created 반환
 *   PUT    — 리소스 전체 교체 (모든 필드 필수)
 *   PATCH  — 리소스 부분 수정 (변경 필드만 전송)
 *   DELETE — 리소스 삭제 → 204 No Content 반환
 */

import { Router, Request, Response } from 'express'
import { users, resetUsers, type User } from '../data/users'

const router = Router()

/**
 * GET /api/users
 * 전체 유저 목록을 반환합니다.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(users)
})

/**
 * POST /api/users/reset
 * 목 데이터를 초기 상태로 되돌립니다. (테스트 편의용)
 * /:id 보다 먼저 선언해야 "reset"이 id로 잘못 매칭되지 않습니다.
 */
router.post('/reset', (_req: Request, res: Response) => {
  resetUsers()
  res.json({ message: 'reset ok', users })
})

/**
 * GET /api/users/:id
 * URL 파라미터 :id에 해당하는 유저 한 명을 반환합니다.
 * 존재하지 않으면 404를 반환합니다.
 */
router.get('/:id', (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return void res.status(404).json({ message: 'Not Found' })
  res.json(user)
})

/**
 * POST /api/users
 * 새 유저를 생성합니다.
 * 요청 바디: { name: string, email: string }
 * id는 서버에서 타임스탬프로 자동 생성하고, 201 Created를 반환합니다.
 */
router.post('/', (req: Request, res: Response) => {
  const newUser: User = {
    id: String(Date.now()),
    name: req.body.name,
    email: req.body.email,
  }
  users.push(newUser)
  res.status(201).json(newUser)
})

/**
 * PUT /api/users/:id — 전체 교체 (Full Update)
 * 요청 바디: { name: string, email: string }
 * 기존 데이터를 버리고 보낸 값으로 완전히 덮어씁니다.
 * 빠진 필드는 undefined가 되므로 모든 필드를 함께 보내야 합니다.
 *
 * PUT vs PATCH:
 *   PUT   → 전체 교체. 빠진 필드는 사라집니다.
 *   PATCH → 부분 수정. 보낸 필드만 바뀝니다.
 */
router.put('/:id', (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === req.params.id)
  if (idx === -1) return void res.status(404).json({ message: 'Not Found' })

  users[idx] = { id: String(req.params.id), name: req.body.name, email: req.body.email }
  res.json(users[idx])
})

/**
 * PATCH /api/users/:id — 부분 수정 (Partial Update)
 * 요청 바디: { name?: string, email?: string }
 * 보낸 필드만 업데이트하고 나머지는 기존 값을 그대로 유지합니다.
 * 예) { name: "새이름" } 만 보내면 email은 변경되지 않습니다.
 */
router.patch('/:id', (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === req.params.id)
  if (idx === -1) return void res.status(404).json({ message: 'Not Found' })

  // 스프레드 연산자로 기존 데이터 위에 변경 사항만 덮어씁니다.
  users[idx] = { ...users[idx], ...req.body }
  res.json(users[idx])
})

/**
 * DELETE /api/users/:id
 * 특정 유저를 삭제합니다.
 * 성공 시 바디 없이 204 No Content를 반환하는 것이 REST 관례입니다.
 */
router.delete('/:id', (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === req.params.id)
  if (idx === -1) return void res.status(404).json({ message: 'Not Found' })

  users.splice(idx, 1)
  res.status(204).send()
})

export default router
