/**
 * 인메모리 목 데이터
 *
 * 실제 DB 없이 이 모듈이 데이터 저장소 역할을 합니다.
 * users 배열을 직접 변경(push/splice/인덱스 대입)하면 핸들러 간 상태가 공유됩니다.
 * 서버를 재시작하면 INITIAL_USERS 기준으로 초기화됩니다.
 */

export type User = {
  id: string
  name: string
  email: string
}

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Carol', email: 'carol@example.com' },
]

// 핸들러에서 직접 참조·변경하는 배열
export const users: User[] = [...INITIAL_USERS]

// 배열 교체 없이 내용만 INITIAL_USERS로 되돌립니다.
// splice로 기존 항목을 모두 지우고 초기 데이터를 삽입하면
// 핸들러가 보유한 참조가 그대로 살아 있어 안전합니다.
export function resetUsers(): void {
  users.splice(0, users.length, ...INITIAL_USERS)
}
