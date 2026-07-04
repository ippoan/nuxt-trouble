import {
  getWorkflowStates, setupDefaultWorkflow, getWorkflowTransitions,
  getCategories, getOffices, getTaskTypes,
  createTicket, updateTicket, transitionTicket, createTask,
} from '~/utils/api'
import { TICKET_CATEGORIES, DEFAULT_TASK_TYPES } from '~/types'
import type { CreateTroubleTicket, TroubleWorkflowState, TroubleWorkflowTransition } from '~/types'

// staging 用ダミーチケット生成 (rust-alc-api 側の変更は不要、既存 REST API を
// ループで叩くだけ)。rust-alc-api staging はアイドル時に DB が揮発するため、
// UI から都度呼び直せる形にしてある (Refs #391 系の staging 揮発性メモ)。

const COMPANIES = ['大石運輸', '北海運送', '一番星物流', '扇興運輸', '丸和運送']
const OFFICES = ['本社営業所', '札幌営業所', '仙台営業所', '福岡営業所']
const DEPARTMENTS = ['第一運行課', '第二運行課', '配送課']
const PERSONS = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋次郎', '伊藤三郎', '渡辺四郎']
const LOCATIONS = ['国道1号線', '東名高速道路', '営業所構内', '得意先駐車場', '交差点付近']
const DESCRIPTIONS = [
  'バック中に電柱と接触し、車両左後部を損傷した。',
  '交差点で対向車と接触した。双方軽傷。',
  '荷降ろし中に商品を落下させ、破損させた。',
  '駐車場内で他社車両とこすれ、双方に傷がついた。',
  '積み込み中の不備について得意先からクレームを受けた。',
]
const PROGRESS_NOTES = ['対応中', '保険会社連絡済み', '示談交渉中', '完了報告待ち', '調査中']
const COUNTERPARTIES = ['', '相手方個人', '相手方運送会社', '得意先']
const TASK_TITLES = ['現場確認', '保険会社への連絡', '相手方との示談交渉', '再発防止策の検討', '始末書提出']

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomPastDate(maxDaysAgo: number): { occurred_at: string; occurred_date: string } {
  const now = new Date()
  const daysAgo = randomInt(0, maxDaysAgo)
  const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  d.setHours(randomInt(6, 20), pick([0, 15, 30, 45]), 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    occurred_at: d.toISOString(),
    occurred_date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  }
}

function buildDummyTicket(categoryNames: string[], officeNames: string[]): CreateTroubleTicket {
  const { occurred_at, occurred_date } = randomPastDate(120)
  const hasMoney = Math.random() < 0.6
  const counterparty = pick(COUNTERPARTIES)
  return {
    category: pick(categoryNames),
    occurred_at,
    occurred_date,
    company_name: pick(COMPANIES),
    office_name: pick(officeNames),
    department: pick(DEPARTMENTS),
    person_name: pick(PERSONS),
    location: pick(LOCATIONS),
    description: pick(DESCRIPTIONS),
    damage_amount: hasMoney ? randomInt(1, 50) * 10000 : null,
    compensation_amount: hasMoney && Math.random() < 0.5 ? randomInt(1, 30) * 10000 : null,
    counterparty: counterparty || null,
    counterparty_insurance: counterparty ? pick(['あいおいニッセイ同和', '東京海上日動', '損保ジャパン', '']) || null : null,
  }
}

/** 初期状態から遷移グラフをランダムに 0〜2 ホック辿ってステータスにばらつきを持たせる */
async function randomizeStatus(
  ticketId: string,
  states: TroubleWorkflowState[],
  transitions: TroubleWorkflowTransition[],
): Promise<void> {
  const initial = states.find(s => s.is_initial)
  if (!initial) return
  let currentId = initial.id
  const hops = randomInt(0, 2)
  for (let i = 0; i < hops; i++) {
    const candidates = transitions.filter(t => t.from_state_id === currentId)
    if (candidates.length === 0) break
    const next = pick(candidates)
    await transitionTicket(ticketId, { to_state_id: next.to_state_id, comment: null })
    currentId = next.to_state_id
  }
}

async function addDummyTasks(ticketId: string, taskTypes: string[]): Promise<void> {
  const count = randomInt(0, 2)
  for (let i = 0; i < count; i++) {
    const { occurred_at } = randomPastDate(30)
    await createTask(ticketId, {
      task_type: pick(taskTypes),
      title: pick(TASK_TITLES),
      description: '',
      next_action: '',
      next_action_detail: '',
      due_date: null,
      occurred_at,
      assigned_to: null,
      next_action_by: pick(PERSONS),
    })
  }
}

export function useDummySeed() {
  const seeding = ref(false)
  const progress = ref({ done: 0, total: 0 })
  const error = ref<string | null>(null)

  async function seedDummyTickets(count: number): Promise<void> {
    if (seeding.value || count <= 0) return
    seeding.value = true
    error.value = null
    progress.value = { done: 0, total: count }
    try {
      let states = await getWorkflowStates().catch(() => [] as TroubleWorkflowState[])
      if (states.length === 0) {
        states = await setupDefaultWorkflow()
      }
      const transitions = await getWorkflowTransitions().catch(() => [] as TroubleWorkflowTransition[])
      const categories = await getCategories().catch(() => [])
      const offices = await getOffices().catch(() => [])
      const taskTypes = await getTaskTypes().catch(() => [])

      const categoryNames = categories.length > 0 ? categories.map(c => c.name) : [...TICKET_CATEGORIES]
      const officeNames = offices.length > 0 ? offices.map(o => o.name) : OFFICES
      const taskTypeNames = taskTypes.length > 0 ? taskTypes.map(t => t.name) : [...DEFAULT_TASK_TYPES]

      for (let i = 0; i < count; i++) {
        const ticket = await createTicket(buildDummyTicket(categoryNames, officeNames))
        if (Math.random() < 0.7) {
          await updateTicket(ticket.id, { progress_notes: pick(PROGRESS_NOTES) })
        }
        await randomizeStatus(ticket.id, states, transitions)
        await addDummyTasks(ticket.id, taskTypeNames)
        progress.value = { done: i + 1, total: count }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'ダミーチケットの生成に失敗しました'
    } finally {
      seeding.value = false
    }
  }

  return { seeding, progress, error, seedDummyTickets }
}
