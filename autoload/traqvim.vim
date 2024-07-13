" channelPath: '\#gps/times/kamecha'
"なんかバッファを作る処理(bufnrとか)と
"バッファを開く処理(:bufferとか)を分けて実装したほうが良さそう
function! traqvim#make_buffer(buf_name) abort
	let buf_name = a:buf_name
	let buf_offset = 1
	while bufexists(buf_name[1:])
		if buf_name =~# ')$'
			let buf_offset = buf_offset + 1
			let buf_name = buf_name[0 : strlen(buf_name) - 4] . '(' . buf_offset . ')'
		else
			let buf_name = buf_name . '(1)'
		endif
	endwhile
	let buf_num = bufnr(buf_name, 1)
	return buf_num
endfunction

function traqvim#draw_message_pin(bufNum, message) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let start = a:message.position["start"]
	let end = a:message.position["end"]
	if a:message->get('pinned')
		call sign_place(0, "VtraQ", "pin", a:bufNum, #{ lnum: start, priority: 10 })
		for i in range(start + 1, end - 1)
			call sign_place(0, "VtraQ", "pin_long", a:bufNum, #{ lnum: i, priority: 10 })
		endfor
	else
		" unplaceはbufferとidしか指定できない
		let pin_signs = sign_getplaced(a:bufNum, #{ group: "VtraQ", lnum: start })
						\ ->filter({ _, v -> v->get('bufnr') == a:bufNum })
						\ ->get(0)
		call sign_unplace(
			\"VtraQ",
			\#{ buffer: a:bufNum, id: pin_signs->get('signs')->get(0)->get('id') })
		for i in range(start + 1, end - 1)
			let pin_long_signs = sign_getplaced(a:bufNum, #{ group: "VtraQ", lnum: i })
								\ ->filter({ _, v -> v->get('bufnr') == a:bufNum })
								\ ->get(0)
			call sign_unplace(
				\"VtraQ",
				\#{ buffer: a:bufNum, id: pin_long_signs->get('signs')->get(0)->get('id') })
		endfor
	endif
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
	if a:message->get('pinned')
		call sign_place(0, "VtraQ", "pin", a:bufNum, #{ lnum: start, priority: 10 })
		for i in range(start + 1, end - 1)
			call sign_place(0, "VtraQ", "pin_long", a:bufNum, #{ lnum: i, priority: 10 })
		endfor
	endif
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

function traqvim#registerTogglePin() abort
	let &opfunc = function('traqvim#togglePin')
	return 'g@'
endfunction

function traqvim#togglePin(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	if messageStart->get('pinned')
		call denops#request('traqvim', 'removePin', [bufnr(), messageStart])
	else
		call denops#request('traqvim', 'createPin', [bufnr(), messageStart])
	endif
endfunction

function traqvim#message_motion() abort
	let position = traqvim#get_message()->get('position')
	call cursor(position->get('start'), 1)
	normal! V
	call cursor(position->get('end'), 1)
endfunction

