" channelPath: '\#gps/times/kamecha'
function! traqvim#make_buffer(channelPath, option) abort
	let buf_name = a:channelPath
	let buf_offset = 1
	while bufexists(buf_name[1:])
		if buf_name =~# ')$'
			let buf_offset = buf_offset + 1
			let buf_name = buf_name[0 : strlen(buf_name) - 4] . '(' . buf_offset . ')'
		else
			let buf_name = buf_name . '(1)'
		endif
	endwhile
	noswapfile exe a:option buf_name
	let buf_num = bufnr(buf_name)
	return buf_num
endfunction

function! traqvim#draw_timeline(bufNum) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let index = 0
	let start = 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	for message in getbufvar(a:bufNum, "channelTimeline")
		let body = traqvim#make_message_body(message, width)
		let end = start + len(body) - 1
		" 一度に全部描画するから、positionをここで設定する
		let message.position = #{ index: index, start: start, end: end }
		call setbufline(a:bufNum, start, body)
		let start = end + 1
		let index = index + 1
	endfor
	call deletebufline(a:bufNum, start, '$')
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function! traqvim#draw_forward_messages(bufNum, messages) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	" startをバッファの最下値にする
	let start = len(getbufline(a:bufNum, 1, '$')) + 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	for message in a:messages
		let body = traqvim#make_message_body(message, width)
		let end = start + len(body) - 1
		call appendbufline(a:bufNum, start - 1, body)
		let start = end + 1
	endfor
	" この関数を呼ばれる前に追加分が既にバッファ変数に登録されてる
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function! traqvim#draw_back_messages(bufNum, messages) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let start = 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	" appendbufline()を使用する
	for message in a:messages
		let body = traqvim#make_message_body(message, width)
		let end = start + len(body) - 1
		call appendbufline(a:bufNum, start - 1, body)
		let start = end + 1
	endfor
	" 既存のメッセージのpositionを更新する
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#draw_delete_message(bufNum, message) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let start = a:message.position["start"]
	let end = a:message.position["end"]
	call deletebufline(a:bufNum, start, end)
	" 既存のメッセージのpositionを更新する
	" この関数を呼ばれる前に削除分が既にバッファ変数から削除されてる
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#draw_insert_message(bufNum, message) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let prevMessage = #{}
	" この関数を呼ばれる前に追加分が既にバッファ変数に登録されてる
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	for message in timeline
		if message.id == a:message.id
			let prevMessage = message
			break
		endif
	endfor
	let start = 1
	if !empty(prevMessage)
		let start = prevMessage.position["end"] + 1
	endif
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	let body = traqvim#make_message_body(a:message, width)
	let end = start + len(body) - 1
	call appendbufline(a:bufNum, start - 1, body)
	" 既存のメッセージのpositionを更新する
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function! traqvim#update_message_position(timeline, key, value) abort
	if a:key == 0
		let start = 1
		let body = traqvim#make_message_body(a:value, winwidth(bufwinid("%")))
		let end = start + len(body) - 1
		let a:value.position = #{ index: 0, start: start, end: end }
	else
		let prev = a:timeline[a:key - 1]
		let start = prev.position["end"] + 1
		let body = traqvim#make_message_body(a:value, winwidth(bufwinid("%")))
		let end = start + len(body) - 1
		let a:value.position = #{ index: a:key, start: start, end: end }
	endif
	return a:value
endfunction

function! traqvim#redraw_recursive(layout) abort
	if a:layout[0] ==# "leaf"
		let bufNum = winbufnr(a:layout[1])
		if getbufvar(bufNum, "&filetype") ==# "traqvim"
			call traqvim#draw_timeline(bufNum)
		endif
	else
		for win in a:layout[1]
			if win[0] ==# "leaf"
				let bufNum = winbufnr(win[1])
				if getbufvar(bufNum, "&filetype") ==# "traqvim"
					call traqvim#draw_timeline(bufNum)
				endif
			else
				call traqvim#redraw_recursive(win)
			endif
		endfor
	endif
endfunction

" Message { user : {id, name, displayName}, content, createdAt }
function! traqvim#make_message_body(message, width) abort
	let header = [ a:message["user"]["displayName"] . " @" . a:message["user"]["name"] . " " . a:message["createdAt"], "" ]
	let rows = split(a:message["content"], "\n")
	let quote = []
	if a:message->has_key("quote")
		if type(a:message["quote"]) == type([])
			for q in a:message["quote"]
				let quote += [ "", ">"]
				let quote += [ "\t". q["user"]["displayName"] . " @" . q["user"]["name"] . " " . q["createdAt"], "" ]
				let quote += map(split(q["content"], "\n"), { _, v -> "\t" . v })
				let quote += [ "", "<"]
			endfor
		endif
	endif
	let footer = [ "", repeat("─", a:width - 2) ] " 2はsigncolumnの分
	let messageBody = header + rows + quote + footer
	return messageBody
endfunction

function! traqvim#get_message_buf(curline, bufNum) abort
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	let message = copy(timeline)->filter({ _, v -> v.position["start"] <= a:curline && a:curline <= v.position["end"] })
	if len(message) == 0
		return {}
	endif
	return message[0]
endfunction

function! traqvim#get_message() abort
	let curline = line(".")
	return traqvim#get_message_buf(curline, bufnr("%"))
endfunction

function! traqvim#message_prev() abort
	let cur = traqvim#get_message()
	if empty(cur)
		return
	endif
	let prev_index = cur.position["index"] - 1
	if prev_index < 0
		return
	endif
	let prev = b:channelTimeline[prev_index]
	call cursor([prev.position["start"], 0])
endfunction

function! traqvim#message_next() abort
	let cur = traqvim#get_message()
	if empty(cur)
		return
	endif
	let next_index = cur.position["index"] + 1
	if next_index >= len(b:channelTimeline)
		return
	endif
	let next = b:channelTimeline[next_index]
	call cursor([next.position["start"], 0])
endfunction

function traqvim#registerYankMessageLink() abort
	let &opfunc = function('traqvim#yankMessageLink')
	return 'g@'
endfunction

function traqvim#yankMessageLink(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	let messageLink = "https://q.trap.jp/messages/" . messageStart->get('id')
	call setreg(v:register, messageLink)
endfunction

function traqvim#registerYankMessageMarkdown() abort
	let &opfunc = function('traqvim#yankMessageMarkdown')
	return 'g@'
endfunction

function traqvim#yankMessageMarkdown(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	call setreg(v:register, messageStart->get('content'))
endfunction

function traqvim#registerDeleteMessage() abort
	let &opfunc = function('traqvim#deleteMessage')
	return 'g@'
endfunction

function traqvim#deleteMessage(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	call denops#request('traqvim', 'messageDelete', [bufnr(), messageStart])
endfunction

function traqvim#message_motion() abort
	let position = traqvim#get_message()->get('position')
	call cursor(position->get('start'), 1)
	normal! V
	call cursor(position->get('end'), 1)
endfunction

