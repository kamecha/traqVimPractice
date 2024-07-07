
let s:completions = #{
			\ token: ['setup', 'delete'],
			\ channel: ['open', 'home', 'reload', 'forward', 'back'],
			\ activity: ['open', 'reload'],
			\ message: ['open', 'send', 'delete', 'edit', 'editApply', 'yankLink', 'yankMarkdown'],
			\ pin: ['create', 'remove'],
			\}

function command#token(args) abort
	if a:args[0] ==# 'setup'
		call denops#request('traqvim', 'setupOAuth', [])
	elseif a:args[0] ==# 'delete'
		call denops#request('traqvim', 'deleteOAuthToken', [])
	endif
endfunction

function command#channel(args) abort
	if a:args[0] ==# 'open'
		 " TODO:↓これtimeline APIの実装側が間違ってるのでいったんこのまま
		call denops#request('traqvim', 'timeline', [a:args[1]])
	elseif a:args[0] ==# 'home'
		call denops#request('traqvim', 'home', [])
	elseif a:args[0] ==# 'reload'
		call denops#request('traqvim', 'reload', [bufnr(), bufname()])
	elseif a:args[0] ==# 'forward'
		call denops#request('traqvim', 'messageForwad', [bufnr(), bufname()])
	elseif a:args[0] ==# 'back'
		call denops#request('traqvim', 'messageBack', [bufnr(), bufname()])
	endif
endfunction

function command#activity(args) abort
	if a:args[0] ==# 'open'
		call denops#request('traqvim', 'activity', [])
	elseif a:args[0] ==# 'reload'
		call denops#request('traqvim', 'reload', [bufnr(), bufname()])
	endif
endfunction

function command#message(args) abort
	if a:args[0] ==# 'open'
		call denops#request('traqvim', 'messageOpen', [bufnr(), bufname()])
	elseif a:args[0] ==# 'send'
		call denops#request('traqvim', 'messageSend', [bufnr(), getline(1, '$')])
	elseif a:args[0] ==# 'delete'
		call denops#request('traqvim', 'messageDelete', [bufnr(), traqvim#get_message()])
	elseif a:args[0] ==# 'edit'
		call denops#request('traqvim', 'messageEditOpen', [bufnr(), traqvim#get_message()])
	elseif a:args[0] ==# 'editApply'
		call denops#request('traqvim', 'messageEdit', [getbufvar(bufname("%"), "editSourceBuffer"), getbufvar(bufname("%"), "message"), getline(1, '$')])
	elseif a:args[0] ==# 'yankLink'
		call denops#request('traqvim', 'yankMessageLink', [traqvim#get_message()])
	elseif a:args[0] ==# 'yankMarkdown'
		call denops#request('traqvim', 'yankMessageMarkdown', [traqvim#get_message()])
	endif
endfunction

function command#pin(args) abort
	if a:args[0] ==# 'create'
		call denops#request('traqvim', 'createPin', [bufnr(), traqvim#get_message()])
	elseif a:args[0] ==# 'remove'
		call denops#request('traqvim', 'removePin', [bufnr(), traqvim#get_message()])
	endif
endfunction

function command#complete(arglead, cmdline, cursorpos) abort
	let cmdline = matchstr(a:cmdline, '^Traq\s\+\zs.*')
	let cmds = split(cmdline)
	let comp = s:completions->keys()
	" TODO: 引数がネストしても適切に対応できるようにする
	if ( a:cmdline[a:cursorpos - 1] == ' ' && len(cmds) == 1 )
				\ || ( a:cmdline[a:cursorpos - 1] != ' ' && len(cmds) == 2 )
		let comp = s:completions[cmds[0]]
	elseif len(cmds) >= 2
		let comp = []
	endif
	" argleadでフィルタリング
	if a:arglead == ''
		return comp
	else
		return filter(copy(comp), {_, v -> v =~? '^' . a:arglead})
	endif
endfunction

function command#call(rargs) abort
	let args = split(a:rargs)
	let cmd = args[0]
	let FuncRef = function('command#' . cmd)
	call FuncRef(args[1:])
endfunction

