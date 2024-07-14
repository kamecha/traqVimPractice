function! traqvim#helper#define_highlight() abort
	highlight! VtraQTime ctermfg=darkgray cterm=bold gui=bold guifg=darkgray
	highlight! VtraQUserName ctermfg=lightgray guifg=lightgray cterm=bold
	highlight! VtraQScreenName ctermfg=lightmagenta guifg=lightmagenta cterm=bold
	highlight! link VtraQQuote Comment
	highlight! link VtraQMessage Keyword
	highlight! link VtraQPin Keyword
endfunction
