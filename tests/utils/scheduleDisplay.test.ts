import { describe, it, expect } from 'vitest'
import type { TroubleSchedule, LineworksMember } from '~/types'
import { SCHEDULE_DISPLAY_LIMIT, sortSchedulesDesc, visibleSchedules, filterLineworksMembers } from '~/utils/scheduleDisplay'

function schedule(id: string, scheduledAt: string): TroubleSchedule {
  return {
    id,
    tenant_id: 't1',
    ticket_id: 'ticket-1',
    scheduled_at: scheduledAt,
    message: 'msg',
    lineworks_user_ids: [],
    cloud_task_name: null,
    status: 'pending',
    created_by: null,
    created_at: '2026-07-01T00:00:00Z',
    sent_at: null,
  }
}

function member(userId: string, userName: string | null, email: string | null = null): LineworksMember {
  return { user_id: userId, user_name: userName, email }
}

describe('sortSchedulesDesc', () => {
  it('scheduled_at 降順 (新しい予約が上) に並べ、元配列は変更しない', () => {
    const input = [
      schedule('a', '2026-07-10T02:18:00Z'),
      schedule('c', '2026-07-10T08:01:00Z'),
      schedule('b', '2026-07-10T03:50:00Z'),
    ]
    const sorted = sortSchedulesDesc(input)
    expect(sorted.map(s => s.id)).toEqual(['c', 'b', 'a'])
    expect(input.map(s => s.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('visibleSchedules', () => {
  const seven = Array.from({ length: 7 }, (_, i) =>
    schedule(`s${i}`, `2026-07-1${i}T00:00:00Z`))

  it('折りたたみ時は既定 5 件だけ返す', () => {
    const v = visibleSchedules(seven, false)
    expect(SCHEDULE_DISPLAY_LIMIT).toBe(5)
    expect(v.length).toBe(5)
    expect(v.map(s => s.id)).toEqual(['s0', 's1', 's2', 's3', 's4'])
  })

  it('showAll なら全件返す', () => {
    expect(visibleSchedules(seven, true).length).toBe(7)
  })

  it('5 件以下ならそのまま返す', () => {
    expect(visibleSchedules(seven.slice(0, 3), false).length).toBe(3)
  })
})

describe('filterLineworksMembers', () => {
  const members = [
    member('u1', '本多 優鷹'),
    member('u2', '青井 健', 'aoi@example.com'),
    member('u3', null, 'suzuki@example.com'),
  ]

  it('空クエリは全件返す', () => {
    expect(filterLineworksMembers(members, '')).toEqual(members)
    expect(filterLineworksMembers(members, '  ')).toEqual(members)
  })

  it('名前の部分一致 (空白を無視して当てる)', () => {
    expect(filterLineworksMembers(members, '本多').map(m => m.user_id)).toEqual(['u1'])
    // 「本多優鷹」(空白なし) でも「本多 優鷹」に一致する
    expect(filterLineworksMembers(members, '本多優鷹').map(m => m.user_id)).toEqual(['u1'])
  })

  it('メールでも一致する (大文字小文字を無視)', () => {
    expect(filterLineworksMembers(members, 'AOI').map(m => m.user_id)).toEqual(['u2'])
    expect(filterLineworksMembers(members, 'suzuki').map(m => m.user_id)).toEqual(['u3'])
  })

  it('一致なしは空配列', () => {
    expect(filterLineworksMembers(members, '存在しない')).toEqual([])
  })
})
