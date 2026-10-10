import { describe, it, expect } from 'vitest'
import { filenameFromContentDisposition } from '~/utils/api'

// 添付ダウンロードの Content-Disposition からファイル名を取る (Refs ippoan/rust-alc-api#747)

describe('filenameFromContentDisposition', () => {
  it('新形式: filename* の日本語名を優先する', () => {
    expect(filenameFromContentDisposition(
      `attachment; filename*=UTF-8''%E5%A0%B1%E5%91%8A%E6%9B%B8.pdf; filename="___.pdf"`,
    )).toBe('報告書.pdf')
  })

  it('新形式: filename が先でも filename* を優先する', () => {
    expect(filenameFromContentDisposition(
      `attachment; filename="___.pdf"; filename*=UTF-8''%E5%A0%B1%E5%91%8A%E6%9B%B8.pdf`,
    )).toBe('報告書.pdf')
  })

  it('新形式: ASCII 名', () => {
    expect(filenameFromContentDisposition(
      `attachment; filename*=UTF-8''report%20v2.pdf; filename="report v2.pdf"`,
    )).toBe('report v2.pdf')
  })

  it('charset の大小文字を問わない', () => {
    expect(filenameFromContentDisposition(`attachment; filename*=utf-8''%E5%86%99%E7%9C%9F.jpg`)).toBe('写真.jpg')
  })

  it('filename* だけ', () => {
    expect(filenameFromContentDisposition(`attachment; filename*=UTF-8''%E5%86%99%E7%9C%9F.jpg`)).toBe('写真.jpg')
  })

  it('旧形式: 引用符ありの filename', () => {
    expect(filenameFromContentDisposition('attachment; filename="test.pdf"')).toBe('test.pdf')
  })

  it('旧形式: 引用符なしの filename', () => {
    expect(filenameFromContentDisposition('attachment; filename=test.pdf')).toBe('test.pdf')
  })

  it('引用符なしの filename は ; の後続を含まない', () => {
    expect(filenameFromContentDisposition('attachment; filename=test.pdf; size=10')).toBe('test.pdf')
  })

  it('壊れた percent-encoding は filename に落ちる', () => {
    expect(filenameFromContentDisposition(
      `attachment; filename*=UTF-8''%E5%A0%ZZ.pdf; filename="fallback.pdf"`,
    )).toBe('fallback.pdf')
  })

  it('UTF-8 以外の charset の filename* は使わず filename に落ちる', () => {
    expect(filenameFromContentDisposition(
      `attachment; filename*=ISO-8859-1''abc.pdf; filename="latin.pdf"`,
    )).toBe('latin.pdf')
  })

  it('filename が空なら download', () => {
    expect(filenameFromContentDisposition('attachment; filename=""')).toBe('download')
  })

  it('filename を含まないヘッダは download', () => {
    expect(filenameFromContentDisposition('attachment')).toBe('download')
  })

  it('ヘッダ無しは download', () => {
    expect(filenameFromContentDisposition(null)).toBe('download')
  })
})
