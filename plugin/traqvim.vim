" if exists('loaded_traq')
" 	finish
" endif
" let g:loaded_traq = 1
"
" :Traq setup でdenopsのsetupAPIを叩く
command! TraqSetup call denops#request('traqvim', 'setup', [])
