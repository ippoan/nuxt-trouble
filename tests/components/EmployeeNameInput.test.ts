import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import EmployeeNameInput from '~/components/EmployeeNameInput.vue'

// Teleport した menu が document.body に残留しないよう毎テスト unmount する
enableAutoUnmount(afterEach)

const EMPLOYEES = [
  { id: 'emp-1', tenant_id: 't1', name: '松江 寛人', code: '001' },
  { id: 'emp-2', tenant_id: 't1', name: '青井 健', code: null },
  { id: 'emp-3', tenant_id: 't1', name: '青山 太郎', code: null },
]

function mountInput(modelValue = '', employees = EMPLOYEES) {
  return mount(EmployeeNameInput, {
    props: { modelValue, employees },
    attrs: { 'data-testid': 'target' },
    attachTo: document.body,
  })
}

function menu(): HTMLElement | null {
  return document.body.querySelector('[data-testid="employee-name-menu"]')
}

function options(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll('[data-testid="employee-name-option"]'))
}

describe('EmployeeNameInput', () => {
  it('focus で全候補の menu を開き、data-testid 等の attrs は inner input に付く', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('[data-testid="target"]')
    expect(input.element.tagName).toBe('INPUT')
    await input.trigger('focus')
    expect(menu()).not.toBeNull()
    expect(options().length).toBe(3)
  })

  it('入力で部分一致フィルタされる (名前 / code どちらでも)', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('input')
    await input.setValue('青')
    expect(options().map(o => o.textContent)).toEqual([
      expect.stringContaining('青井 健'),
      expect.stringContaining('青山 太郎'),
    ])
    await input.setValue('001')
    expect(options().length).toBe(1)
    expect(options()[0]!.textContent).toContain('松江 寛人')
  })

  it('候補クリックで名前を確定し select を emit、menu を閉じる', async () => {
    const wrapper = mountInput()
    await wrapper.find('input').setValue('青井')
    options()[0]!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['青井 健'])
    expect(wrapper.emitted('select')!.at(-1)).toEqual([EMPLOYEES[1]])
    expect(menu()).toBeNull()
  })

  it('ArrowDown + Enter でハイライト中の候補を選択する', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowUp' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['青井 健'])
    expect(menu()).toBeNull()
  })

  it('menu を閉じた状態の ArrowDown は menu を開く', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'Escape' })
    expect(menu()).toBeNull()
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(menu()).not.toBeNull()
  })

  it('ハイライト無しの Enter は menu を閉じて blur する (自由テキスト確定)', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('input')
    await input.setValue('マスタ外の名前')
    expect(menu()).toBeNull() // 一致 0 件なので menu は出ない
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('Escape で menu が閉じる', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('input')
    await input.trigger('focus')
    expect(menu()).not.toBeNull()
    await input.trigger('keydown', { key: 'Escape' })
    expect(menu()).toBeNull()
  })

  it('blur で menu を閉じ blur を emit する', async () => {
    const wrapper = mountInput()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('blur')
    expect(menu()).toBeNull()
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  it('従業員が空なら menu を開かない', async () => {
    const wrapper = mountInput('', [])
    await wrapper.find('input').trigger('focus')
    expect(menu()).toBeNull()
  })

  // モーダル (Reka UI Dialog) 内で使われるケースの回帰ガード (Refs #215):
  // body に pointer-events: none が付いても menu 側で継承を断ってクリック可能にし、
  // pointerdown が document (= Dialog の外側クリック判定) まで伝播しないこと。
  describe('モーダル内での利用 (body pointer-events: none 環境)', () => {
    it('menu は pointer-events-auto で継承を断つ', async () => {
      const wrapper = mountInput()
      await wrapper.find('input').trigger('focus')
      expect(menu()!.className).toContain('pointer-events-auto')
    })

    it('menu 上の pointerdown は document へ伝播しない (モーダルが閉じない)', async () => {
      const wrapper = mountInput()
      await wrapper.find('input').trigger('focus')
      const outsideDetector = vi.fn()
      document.addEventListener('pointerdown', outsideDetector)
      menu()!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      expect(outsideDetector).not.toHaveBeenCalled()
      // input 自身への pointerdown は素通しされる (通常のフォーカス動作を妨げない)
      wrapper.find('input').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      expect(outsideDetector).toHaveBeenCalledTimes(1)
      document.removeEventListener('pointerdown', outsideDetector)
    })
  })
})
