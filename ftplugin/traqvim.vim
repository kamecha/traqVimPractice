
setlocal noswapfile
setlocal signcolumn=yes
setlocal nolist

" TODO: nerd font導入してるかの確認とかしたいな
" call sign_define("pin", #{ text: "📌"})
call sign_define("pin", #{ text: "󰐃", texthl: "VtraQPin"}) "f0403 ← nerd font導入後、これに対応してるらしい
call sign_define("pin_long", #{ text: "│" , texthl: "VtraQPin"})

nnoremap <buffer><silent> <Plug>(traqvim-next)
			\ <Cmd>call traqvim#message_next()<CR>
nnoremap <buffer><silent> <Plug>(traqvim-prev)
			\ <Cmd>call traqvim#message_prev()<CR>

nnoremap <buffer><expr> <Plug>(traqvim-yank-message-link-operator)
			\ traqvim#registerYankMessageLink()
nnoremap <buffer><expr> <Plug>(traqvim-yank-message-markdown-operator)
			\ traqvim#registerYankMessageMarkdown()
nnoremap <buffer><expr> <Plug>(traqvim-delete-message-operator)
			\ traqvim#registerDeleteMessage()
nnoremap <buffer><expr> <Plug>(traqvim-toggle-pin-operator)
			\ traqvim#registerTogglePin()

onoremap <buffer><silent> <Plug>(traqvim-message-motion)
			\ :<C-u>call traqvim#message_motion()<CR>

command! -buffer -nargs=0 TraqYankMessageLink
			\ call denops#request('traqvim', 'yankMessageLink', [traqvim#get_message()])
command! -buffer -nargs=0 TraqYankMessageMarkdown
			\ call denops#request('traqvim', 'yankMessageMarkdown', [traqvim#get_message()])

" filetypeがtraqvimの時かつ、ウィンドウのサイズが変更された時だけ実行

augroup traqvim
	autocmd!
	autocmd WinResized *
				\ if &ft == 'traqvim' |
				\   call traqvim#redraw_recursive(winlayout()) |
				\ endif
	autocmd CursorMoved *
				\ :match VtraQMessage '\v^─*%(─%#|%#─)─*\n%(%(.*[^─].*|)\n)+─+$|^─+\n%(%(.*[^─].*|)\n)+─*%(─%#|%#─)─*$|^─+\n%(%(.*[^─].*|)\n)*%(.*[^─].*%#.*|.*%#.*[^─].*|%#)\n%(%(.*[^─].*|)\n)*─+$'
augroup END
