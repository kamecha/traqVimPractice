
setlocal noswapfile
setlocal signcolumn=no
nnoremap <buffer><silent> r
			\ :TraqReload<CR>
nnoremap <buffer><silent> o
			\ :TraqMessageOpen<CR>
nnoremap <buffer><silent> <Plug>(traqvim-next)
			\ <Cmd>call traqvim#message_next()<CR>
nnoremap <buffer><silent> <Plug>(traqvim-prev)
			\ <Cmd>call traqvim#message_prev()<CR>

nnoremap <buffer><expr> <Plug>(traqvim-yank-message-link-operator)
			\ traqvim#registerYankMessageLink()
nnoremap <buffer><expr> <Plug>(traqvim-yank-message-markdown-operator)
			\ traqvim#registerYankMessageMarkdown()

onoremap <silent> <Plug>(traqvim-message-motion)
			\ :<C-u>call traqvim#message_motion()<CR>

omap <buffer> im
			\ <Plug>(traqvim-message-motion)

nmap <buffer> <LocalLeader>y
			\ <Plug>(traqvim-yank-message-link-operator)

nmap <buffer> <LocalLeader>Y
			\ <Plug>(traqvim-yank-message-markdown-operator)

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
