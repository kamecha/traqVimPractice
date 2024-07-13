
let s:subcommands = #{
			\ token: #{
			\   args: ['setup', 'delete'],
			\   impl: function('command#token'),
			\   comp: function('command#tokenComplete'),
			\ },
			\ channel: #{
			\   args: ['open', 'home', 'reload', 'forward', 'back'],
			\   impl: function('command#channel'),
			\   comp: function('command#channelComplete'),
			\ },
			\ activity: #{
			\   args: ['open', 'reload'],
			\   impl: function('command#activity'),
			\   comp: function('command#activityComplete'),
			\ },
			\ message: #{
			\   args: ['open', 'send', 'delete', 'edit', 'editApply', 'yankLink', 'yankMarkdown'],
			\   impl: function('command#message'),
			\   comp: function('command#messageComplete'),
			\ },
			\ pin: #{
			\   args: ['create', 'remove'],
			\   impl: function('command#pin'),
			\   comp: function('command#pinComplete'),
			\ },
			\}

function command#token(args) abort
	if a:args[0] ==# 'setup'
		call denops#request('traqvim', 'setupOAuth', [])
	elseif a:args[0] ==# 'delete'
		call denops#request('traqvim', 'deleteOAuthToken', [])
	endif
endfunction

function command#tokenComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return s:subcommands.token.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
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

function command#channelComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return s:subcommands.channel.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function command#activity(args) abort
	if a:args[0] ==# 'open'
		call denops#request('traqvim', 'activity', [])
	elseif a:args[0] ==# 'reload'
		call denops#request('traqvim', 'reload', [bufnr(), bufname()])
	endif
endfunction

function command#activityComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return s:subcommands.activity.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
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

function command#messageComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return s:subcommands.message.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function command#pin(args) abort
	if a:args[0] ==# 'create'
		call denops#request('traqvim', 'createPin', [bufnr(), traqvim#get_message()])
	elseif a:args[0] ==# 'remove'
		call denops#request('traqvim', 'removePin', [bufnr(), traqvim#get_message()])
	endif
endfunction

function command#pinComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return s:subcommands.pin.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function command#complete(arglead, cmdline, cursorpos) abort
	" subcommandを取得
	let subcmd = matchstr(a:cmdline, '^Traq\s\+\zs\w\+')
	let subcmdArgLead = matchstr(a:cmdline, '^Traq\s\+\w\+\s\+\zs\w\+')
	" subcommandの引数を補完
	if subcmd != ''
				\ && has_key(s:subcommands, subcmd) == 1
				\ && has_key(s:subcommands[subcmd], 'comp') == 1
		return s:subcommands[subcmd].comp(a:arglead, a:cmdline)
	endif
	" subcommandを補完
	let cmdline = matchstr(a:cmdline, '^Traq\s\+\w*$')
	if cmdline != ''
		let subcmdKeys = s:subcommands->keys()
		return subcmdKeys->filter({_, v -> v =~? '^' . a:arglead})
	endif
endfunction

function command#call(rargs) abort
	let args = split(a:rargs)
	let subcommandKey = args[0]
	let subcommand = s:subcommands->get(subcommandKey)
	if type(subcommand) ==# type(0) && subcommand ==# 0
		echomsg 'subcommand not found: ' . subcommandKey
		return
	endif
	call subcommand.impl(args[1:])
endfunction

