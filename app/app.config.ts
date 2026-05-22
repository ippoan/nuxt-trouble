export default defineAppConfig({
  ui: {
    select: {
      slots: {
        // トリガー幅は固定で並べたいが、開いたメニュー側はラベル全文を表示したい。
        // min-w でトリガー幅を下限に保ちつつ w-fit で内容に追従して広がるようにする。
        content: 'min-w-(--reka-select-trigger-width) w-fit',
      },
    },
  },
})
