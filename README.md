
<img src="https://user-images.githubusercontent.com/50443168/221812130-bfbd543b-7199-4999-a93d-7972ea7f4500.png" width="100px">
↑なんちゃってロゴ

# traQのvimクライアントの練習

部内SNS[†traQ†](https://github.com/traPtitech/traQ)のvimクライアント

まだ実装途中なので、後々破滅的変更が入る可能性おおいにあり

## Requirements(要件)
- [deno](https://deno.land/)
- [denops.vim](https://github.com/vim-denops/denops.vim)
- [ddu.vim](https://github.com/Shougo/ddu.vim) (Optional)
- [ddc.vim](https://github.com/Shougo/ddc.vim) (Optional)
- [open-browser.vim](https://github.com/tyru/open-browser.vim) (Optional)

## 他プラグインとの連携

プラグイン本体はメッセージの受信・送信程度の簡単な事しかしないが、他プラグイン（ddc・ddu）等と連携することによってある程度便利になっています

## Demo
dduとの連携
![image](https://user-images.githubusercontent.com/50443168/221398009-dabb4d63-e8c9-481e-9849-3e1e8236dda7.png)

ddcとの連携
![image](https://user-images.githubusercontent.com/50443168/221398079-da91a873-5f8d-4c5a-af1c-650e4b88e09b.png)

## 今後の展望
WebSocketとか実装して、手動リロードしなくてもいいようにしたいなぁ...
