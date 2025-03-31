<img src="https://user-images.githubusercontent.com/50443168/221812130-bfbd543b-7199-4999-a93d-7972ea7f4500.png" width="100px">
↑なんちゃってロゴ

**作ってた人が†を凍結されちゃったので、アーカイブ中...**

# traQのvimクライアントの練習

[![Doc](https://img.shields.io/badge/doc-%3Ah%20traqvim-orange.svg)](doc/traqvim.jax)

部内SNS[†traQ†](https://github.com/traPtitech/traQ)のvimクライアント

まだ実装途中なので、後々破滅的変更が入る可能性おおいにあり

[使い方兼紹介記事](https://trap.jp/post/1870/)

## Requirements(要件)

- [deno](https://deno.land/)
- [denops.vim](https://github.com/vim-denops/denops.vim)
- [ddu.vim](https://github.com/Shougo/ddu.vim) (Optional)
- [ddc.vim](https://github.com/Shougo/ddc.vim) (Optional)
- [open-browser.vim](https://github.com/tyru/open-browser.vim) (Optional)
- [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) (Optional)

## 他プラグインとの連携

プラグイン本体はメッセージの受信・送信程度の簡単な事しかしないが、他プラグイン（ddc・ddu）等と連携することによってある程度便利になっています

## Demo

dduとの連携

ddu-ui-ff
![image](https://user-images.githubusercontent.com/50443168/232486308-a0bffbdd-8bf5-4b95-934d-f6e9f2bec3f1.png)

ddu-ui-filer
![image](https://user-images.githubusercontent.com/50443168/232487032-9bcf237e-3f74-434c-9c6f-d37793e4a033.png)

ddcとの連携
![image](https://user-images.githubusercontent.com/50443168/221398079-da91a873-5f8d-4c5a-af1c-650e4b88e09b.png)

## 設定

```vim
" for keymap

autocmd FileType traqvim call s:traqvim_setting()

function s:traqvim_setting()
	omap <buffer> im
				\ <Plug>(traqvim-motion-message)
	nmap <buffer> <LocalLeader>y
				\ <Plug>(traqvim-operator-message-yank-link)
	nmap <buffer> <LocalLeader>Y
				\ <Plug>(traqvim-operator-message-yank-markdown)
	nmap <buffer> <LocalLeader>d
				\ <Plug>(traqvim-operator-message-delete)
	nmap <buffer> <LocalLeader>p
				\ <Plug>(traqvim-operator-pin-toggle)
endfunction
```

telescope.nvimとの連携

```lua
require("telescope").load_extension "traqvim"
```

## 今後の展望

WebSocketとか実装して、手動リロードしなくてもいいようにしたいなぁ...
