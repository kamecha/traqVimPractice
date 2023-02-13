" if exists('loaded_traq')
" 	finish
" endif
" let g:loaded_traq = 1
"
" :Traq setup でdenopsのsetupAPIを叩く
command! TraqSetup call denops#request('traqvim', 'setup', [])
" :Traq timeline でdenopsのtimelineAPIを叩く
command! TraqTimeline call denops#request('traqvim', 'timeline', [])
