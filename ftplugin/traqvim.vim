
setlocal noswapfile
setlocal signcolumn=yes
setlocal nolist
setlocal wrap
setlocal foldmethod=marker
setlocal foldtext=traqvim#view#folded_stamp_text()

" TODO: nerd font導入してるかの確認とかしたいな
" call sign_define("pin", #{ text: "📌"})
call sign_define("pin", #{ text: "󰐃", texthl: "VtraQPin"}) "f0403 ← nerd font導入後、これに対応してるらしい
call sign_define("pin_long", #{ text: "│" , texthl: "VtraQPin"})

nnoremap <buffer><silent> <Plug>(traqvim-next)
			\ <Cmd>call traqvim#message#message_next()<CR>
nnoremap <buffer><silent> <Plug>(traqvim-prev)
			\ <Cmd>call traqvim#message#message_prev()<CR>
nnoremap <buffer><silent> <Plug>(traqvim-goto)
			\ <Cmd>call traqvim#message#goto_message()<CR>

nnoremap <buffer><expr> <Plug>(traqvim-operator-message-yank-link)
			\ traqvim#message#registerYankMessageLink()
nnoremap <buffer><expr> <Plug>(traqvim-operator-message-yank-markdown)
			\ traqvim#message#registerYankMessageMarkdown()
nnoremap <buffer><expr> <Plug>(traqvim-operator-message-delete)
			\ traqvim#message#registerDeleteMessage()
nnoremap <buffer><expr> <Plug>(traqvim-operator-pin-toggle)
			\ traqvim#message#registerTogglePin()

onoremap <buffer><silent> <Plug>(traqvim-motion-message)
			\ :<C-u>call traqvim#message#message_motion()<CR>

" filetypeがtraqvimの時かつ、ウィンドウのサイズが変更された時だけ実行

augroup traqvim
	autocmd!
	autocmd WinResized *
				\ if &ft == 'traqvim' |
				\   call traqvim#view#redraw_recursive(winlayout()) |
				\ endif
	autocmd CursorMoved *
				\ :match VtraQMessage '\v^─*%(─%#|%#─)─*\n%(%(.*[^─].*|)\n)+─+$|^─+\n%(%(.*[^─].*|)\n)+─*%(─%#|%#─)─*$|^─+\n%(%(.*[^─].*|)\n)*%(.*[^─].*%#.*|.*%#.*[^─].*|%#)\n%(%(.*[^─].*|)\n)*─+$'
augroup END
