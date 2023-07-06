" if exists('loaded_traq')
" 	finish
" endif
" let g:loaded_traq = 1
"
" :Traq setup でdenopsのsetupAPIを叩く
command! TraqSetup call denops#request('traqvim', 'setupOAuth', [])
" homeChannelを開く
command! TraqHome call denops#request('traqvim', 'home', [])
" :Traq timeline でdenopsのtimelineAPIを叩く
command! -nargs=1 TraqTimeline call denops#request('traqvim', 'timeline', [<q-args>])
" activity
command! TraqActivity call denops#request('traqvim', 'activity', [])
" reload
command! TraqReload call denops#request('traqvim', 'reload', [bufnr(), bufname()])
" fetch forward
command! TraqFetchForward call denops#request('traqvim', 'messageForward', [bufnr(), bufname()])
" messageバッファの作成
command! TraqMessageOpen call denops#request('traqvim', 'messageOpen', [bufnr(), bufname()])
" messageの送信
command! TraqMessageSend call denops#request('traqvim', 'messageSend', [bufname(), getline(1, '$')])

call helper#define_highlight()

augroup traqvim
	" チャンネル名が`#`から始まるため、展開先の`ddu-ff-filter-default`を指定してあげてる
	" チャンネル名の仕様が変わるとここも変更する
	" あんましよくない気がするので、そのうち変えたいのだ...
	autocmd BufWinEnter *
		\ if matchstr(bufname(), "ddu-ff:ddu-ff-filter-default") !=# "" |
		\   echomsg "bufname" |
		\   call traqvim#draw_timeline(bufnr()) |
		\   setlocal nonumber |
		\ endif
augroup END
