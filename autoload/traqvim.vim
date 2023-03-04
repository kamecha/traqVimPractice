function! traqvim#make_buffer(channelPath, option) abort
	let buf_num = 0
	noswapfile exe a:option a:channelPath
	let buf_num = bufnr(a:channelPath)
	return buf_num
endfunction

function! traqvim#draw_timeline(bufNum) abort
	setlocal modifiable
	let start = 1
	echomsg "bufNum: " . a:bufNum
	let winnr = bufwinid(a:bufNum)
	echomsg "winnr: " . winnr
	let wininfo = getwininfo(winnr)[0]
	let width = winwidth(winnr)
	if has_key(wininfo, 'textoff')
		let width -= wininfo.textoff
	endif
	for message in b:channelTimeline
		let body = traqvim#make_message_body(message, width)
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
