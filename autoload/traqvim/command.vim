
let g:traqvim#command#subcommands = #{
			\ token: #{
			\   args: ['setup', 'delete'],
			\   impl: function('traqvim#command#token'),
			\   comp: function('traqvim#command#tokenComplete'),
			\ },
			\ channel: #{
			\   args: ['open', 'home', 'reload', 'forward', 'back'],
			\   impl: function('traqvim#command#channel'),
			\   comp: function('traqvim#command#channelComplete'),
			\ },
			\ activity: #{
			\   args: ['open', 'reload'],
			\   impl: function('traqvim#command#activity'),
			\   comp: function('traqvim#command#activityComplete'),
			\ },
			\ message: #{
			\   args: ['open', 'send', 'delete', 'edit', 'editApply', 'yankLink', 'yankMarkdown'],
			\   impl: function('traqvim#command#message'),
			\   comp: function('traqvim#command#messageComplete'),
			\ },
			\ stamp: #{
			\   args: ['add', 'remove'],
			\   impl: function('traqvim#command#stamp'),
			\   comp: function('traqvim#command#stampComplete'),
			\ },
			\ pin: #{
			\   args: ['create', 'remove'],
			\   impl: function('traqvim#command#pin'),
			\   comp: function('traqvim#command#pinComplete'),
			\ },
			\}

function traqvim#command#token(args) abort
	if a:args[0] ==# 'setup'
		call denops#request('traqvim', 'setupOAuth', [])
	elseif a:args[0] ==# 'delete'
		call denops#request('traqvim', 'deleteOAuthToken', [])
	endif
endfunction

function traqvim#command#tokenComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return g:traqvim#command#subcommands.token.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function traqvim#command#channel(args) abort
	if a:args[0] ==# 'open'
		call denops#request('traqvim', 'timeline', [a:args[1]])
	elseif a:args[0] ==# 'home'
		call denops#request('traqvim', 'home', [])
	elseif a:args[0] ==# 'reload'
		call denops#request('traqvim', 'reload', [bufnr(), bufname()])
	elseif a:args[0] ==# 'forward'
		call denops#request('traqvim', 'messageForward', [bufnr(), bufname()])
	elseif a:args[0] ==# 'back'
		call denops#request('traqvim', 'messageBack', [bufnr(), bufname()])
	endif
endfunction

function traqvim#command#channelComplete(arglead, cmdline) abort
	" ['Traq', 'channel', ...]
	let cmds = split(a:cmdline)
	" openの場合はチャンネル名を補完
	if len(cmds) >= 3 && cmds[2] ==# 'open'
		if len(cmds) == 3
			return ['#']
		elseif len(cmds) == 4
			let channels = denops#request('traqvim', 'channelList', [])
			return channels->map({_, v -> v['path']})->matchfuzzy(a:arglead)
		endif
	endif
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(cmds) >= 3
		return []
	endif
	return g:traqvim#command#subcommands.channel.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function traqvim#command#activity(args) abort
	if a:args[0] ==# 'open'
		call denops#request('traqvim', 'activity', [])
	elseif a:args[0] ==# 'reload'
		call denops#request('traqvim', 'reload', [bufnr(), bufname()])
	endif
endfunction

function traqvim#command#activityComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return g:traqvim#command#subcommands.activity.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function traqvim#command#message(args) abort
	if a:args[0] ==# 'open'
		call denops#request('traqvim', 'messageOpen', [bufnr(), bufname()])
	elseif a:args[0] ==# 'send'
		call denops#request('traqvim', 'messageSend', [bufnr(), getline(1, '$')])
	elseif a:args[0] ==# 'delete'
		call denops#request('traqvim', 'messageDelete', [bufnr(), traqvim#message#get_message()])
	elseif a:args[0] ==# 'edit'
		call denops#request('traqvim', 'messageEditOpen', [bufnr(), traqvim#message#get_message()])
	elseif a:args[0] ==# 'editApply'
		call denops#request('traqvim', 'messageEdit', [getbufvar(bufname("%"), "editSourceBuffer"), getbufvar(bufname("%"), "message"), getline(1, '$')])
	elseif a:args[0] ==# 'yankLink'
		call denops#request('traqvim', 'yankMessageLink', [traqvim#message#get_message()])
	elseif a:args[0] ==# 'yankMarkdown'
		call denops#request('traqvim', 'yankMessageMarkdown', [traqvim#message#get_message()])
	endif
endfunction

function traqvim#command#messageComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return g:traqvim#command#subcommands.message.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function traqvim#command#stamp(args) abort
	if a:args[0] ==# 'add'
		call denops#request('traqvim', 'messageAddStamps', [bufnr(), traqvim#message#get_message(), a:args[1:]])
	elseif a:args[0] ==# 'remove'
		call denops#request('traqvim', 'messageRemoveStamps', [bufnr(), traqvim#message#get_message(), a:args[1:]])
	endif
endfunction

function traqvim#command#stampComplete(arglead, cmdline) abort
	let cmds = split(a:cmdline)
	" addの場合はスタンプ名を補完
	if len(cmds) >= 3 && cmds[2] ==# 'add'
		let stamps = denops#request('traqvim', 'getStamps', [])
		return stamps->map({_, v -> v['name']})->matchfuzzy(a:arglead)
	endif
	" removeの場合はスタンプに押されてるスタンプを補完
	if len(cmds) >= 3 && cmds[2] ==# 'remove'
		let message = traqvim#message#get_message()
		let stamps = message->get('stamps', [])
		let ret = []
		" TODO: userIDを取得して自分が押したスタンプだけを補完する
		for stamp in stamps
			let s = denops#request('traqvim', 'getStamp', [stamp['stampId']])
			let ret += [s['name']]
		endfor
		return ret->matchfuzzy(a:arglead)
	endif
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return g:traqvim#command#subcommands.stamp.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function traqvim#command#pin(args) abort
	if a:args[0] ==# 'create'
		call denops#request('traqvim', 'createPin', [bufnr(), traqvim#message#get_message()])
	elseif a:args[0] ==# 'remove'
		call denops#request('traqvim', 'removePin', [bufnr(), traqvim#message#get_message()])
	endif
endfunction

function traqvim#command#pinComplete(arglead, cmdline) abort
	if a:cmdline[strlen(a:cmdline)-1] ==# ' ' && len(split(a:cmdline)) >= 3
		return []
	endif
	return g:traqvim#command#subcommands.pin.args->copy()->filter({_, v -> v =~? '^' . a:arglead})
endfunction

function traqvim#command#complete(arglead, cmdline, cursorpos) abort
	" subcommandを取得
	let subcmd = matchstr(a:cmdline, '^Traq\s\+\zs\w\+')
	let subcmdArgLead = matchstr(a:cmdline, '^Traq\s\+\w\+\s\+\zs\w\+')
	" subcommandの引数を補完
	if subcmd != ''
				\ && has_key(g:traqvim#command#subcommands, subcmd) == 1
				\ && has_key(g:traqvim#command#subcommands[subcmd], 'comp') == 1
		return g:traqvim#command#subcommands[subcmd].comp(a:arglead, a:cmdline)
	endif
	" subcommandを補完
	let cmdline = matchstr(a:cmdline, '^Traq\s\+\w*$')
	if cmdline != ''
		let subcmdKeys = g:traqvim#command#subcommands->keys()
		return subcmdKeys->filter({_, v -> v =~? '^' . a:arglead})
	endif
endfunction

function traqvim#command#call(rargs) abort
	let args = split(a:rargs)
	let subcommandKey = args[0]
	let subcommand = g:traqvim#command#subcommands->get(subcommandKey)
	if type(subcommand) ==# type(0) && subcommand ==# 0
		echomsg 'subcommand not found: ' . subcommandKey
		return
	endif
	call subcommand.impl(args[1:])
endfunction

