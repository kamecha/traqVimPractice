
setlocal noswapfile
nnoremap <buffer><silent> r
			\ :TraqReload<CR>
nnoremap <buffer><silent> o
			\ :TraqMessageOpen<CR>

" filetypeがtraqvimの時かつ、ウィンドウのサイズが変更された時だけ実行

augroup traqvim
	autocmd!
	autocmd WinResized *
		\ if &ft == 'traqvim' |
		\   call traqvim#redraw_recursive(winlayout()) |
		\ endif
augroup END
