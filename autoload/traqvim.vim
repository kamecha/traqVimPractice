function! traqvim#make_buffer(channelPath, option) abort
	let buf_num = 0
	if a:option ==# "open"
		exe "edit" a:channelPath
		let buf_num = bufnr(a:channelPath)
	endif
	if a:option ==# "tab"
		exe "tabnew" a:channelPath
		let buf_num = bufnr(a:channelPath)
	endif
	if a:option ==# "split"
		exe "split" a:channelPath
		let buf_num = bufnr(a:channelPath)
	endif
	if a:option ==# "vsplit"
		exe "vsplit" a:channelPath
		let buf_num = bufnr(a:channelPath)
	endif
	if a:option ==# "hidden"
		let buf_num = bufadd(a:channelPath)
		call bufload(buf_num)
	endif
	echo buf_num
	return buf_num
endfunction

function! traqvim#draw_timeline(bufNum, channelTimeline) abort
	setlocal modifiable
	let start = 1
	" let wininfo = getwininfo(win_getid())[0]
	" let width = winwidth(0)
	" if has_key(wininfo, 'textoff')
	" 	let width -= wininfo.textoff
	" endif
	for message in a:channelTimeline
		let body = traqvim#make_message_body(message, 8)
		let end = start + len(body)
		call setbufline(a:bufNum, start, body)
		let start = end
	endfor
	setlocal nomodifiable
endfunction

" Message { displayName, content, createdAt }
function! traqvim#make_message_body(message, width) abort
	let header = [ a:message["displayName"] . " " . a:message["createdAt"], "" ]
	let rows = split(a:message["content"], "\n")
	let footer = [ "", repeat("-", a:width) ]
	let messageBody = header + rows + footer
	return messageBody
endfunction
