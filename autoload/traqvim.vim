function! traqvim#make_buffer(channelPath) abort
	let win_list = win_findbuf(bufnr(a:channelPath))
	if empty(win_list)
		exe "tabnew" a:channelPath
	else
		keepjumps call win_gotoid(win_list[0])
	endif
endfunction

function! traqvim#draw_timeline() abort
	setlocal modifiable
	let start = 1
	for message in b:channelTimeline
		let body = s:make_message_body(message)
		let end = start + len(body)
		call setline(start, body)
		let start = end
	endfor
	setlocal nomodifiable
endfunction

" Message { displayName, content, createdAt }
function! s:make_message_body(message) abort
	let wininfo = getwininfo(win_getid())[0]
	let width = winwidth(0)
	if has_key(wininfo, 'textoff')
		let width -= wininfo.textoff
	endif
	let header = [ a:message["displayName"] . " " . a:message["createdAt"], "" ]
	let rows = split(a:message["content"], "\n")
	let footer = [ "", repeat("-", width) ]
	let messageBody = header + rows + footer
	return messageBody
endfunction
