/**
 * 日付セル input に付ける inputmode を返す。
 *
 * タッチ端末 (pointer: coarse) ではソフトキーボードをテンキーにしたいので
 * 'numeric'。物理キーボード環境では undefined (属性なし) — inputmode="numeric"
 * を付けると MS-IME 等がフォーカス移動 (Tab) だけで半角英数へ自動切替し、
 * その IME モードが以降のかな欄まで持続する (「次の欄でかなに戻らない」の
 * 根本原因、Refs #225 ②)。属性を付けなければ IME はかなモードのまま維持され、
 * 全角数字は sanitize (toHalfWidth) が半角化して受け付ける。
 */
export function numericInputmodeForTouch(): 'numeric' | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
  return window.matchMedia('(pointer: coarse)').matches ? 'numeric' : undefined
}
