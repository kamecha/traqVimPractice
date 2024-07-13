" if exists('loaded_traq')
" 	finish
" endif
" let g:loaded_traq = 1
"

command! -nargs=+
			\ -complete=customlist,traqvim#command#complete
			\ Traq
			\ call traqvim#command#call(<q-args>)

call traqvim#helper#define_highlight()

let g:traqvim#fetch_limit = 20
let g:traqvim#token_file_path = expand('~/.config/traq/token.json')

augroup traqvim
	" チャンネル名が`#`から始まるため、展開先の`ddu-ff-filter-default`を指定してあげてる
	" チャンネル名の仕様が変わるとここも変更する
	" あんましよくない気がするので、そのうち変えたいのだ...
	autocmd BufWinEnter *
		\ if matchstr(bufname(), "ddu-ff:ddu-ff-filter-default") !=# "" |
		\   echomsg "bufname" |
		\   call traqvim#view#draw_timeline(bufnr()) |
		\   setlocal nonumber |
		\ endif
augroup END
