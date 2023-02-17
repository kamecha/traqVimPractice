" if exists('loaded_traq')
" 	finish
" endif
" let g:loaded_traq = 1
"
" :Traq setup でdenopsのsetupAPIを叩く
command! TraqSetup call denops#request('traqvim', 'setup', [])
" homeChannelを開く
command! TraqHome call denops#request('traqvim', 'home', [])
" :Traq timeline でdenopsのtimelineAPIを叩く
command! -nargs=1 TraqTimeline call denops#request('traqvim', 'timeline', [<q-args>])
" reload
command! TraqReload call denops#request('traqvim', 'reload', [bufnr(), bufname()])
