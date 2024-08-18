" バッファ変数の情報を元に描画する関数郡

" Message { user : {id, name, displayName}, content, createdAt }
" return {
"	body: string[],
"	position: {
"		quote: {
"			index: number,
"			start: number,
"			end: number
"		}[]
"	}
" }
function traqvim#view#make_message_body(message, width) abort
	let createdAt = denops#request('traqvim', 'convertDate', [a:message["createdAt"]])
	let header = [ a:message["user"]["displayName"] . " @" . a:message["user"]["name"] . " " . createdAt, "" ]
	let rows = split(a:message["content"], "\n")
	let quotes = []
	let quotePos = []
	if a:message->has_key("quote")
		if type(a:message["quote"]) == type([])
			for q in a:message["quote"]
				let createdAt = denops#request('traqvim', 'convertDate', [q["createdAt"]])
				let quote = []
				let quote += [ ">" ]
				let quote += [ "\t". q["user"]["displayName"] . " @" . q["user"]["name"] . " " . createdAt, "" ]
				let quote += map(split(q["content"], "\n"), { _, v -> "\t" . v })
				let quote += [ "", "<"]
				let quotes += [ quote ]
				let quotePos += [#{
							\ index: len(quotes) - 1,
							\ start: len(header) + len(rows) + copy(quotes)->flatten()->len() - len(quote) + 1,
							\ end: len(header) + len(rows) + copy(quotes)->flatten()->len()
							\}]
			endfor
		endif
	endif
	let stamps = []
	if !empty(a:message.stamps)
		let stamps += [ "{{{" ]
	endif
	for stamp in a:message.stamps
		let s = denops#request('traqvim', 'getStamp', [stamp.stampId])
		let user = denops#request('traqvim', 'getUser', [stamp.userId])
		let stamps += [ ":" . s.name . ":" . user.displayName . "(" . stamp.count . ")" ]
	endfor
	if !empty(a:message.stamps)
		let stamps += [ "}}}" ]
	endif
	let footer = [ "", repeat("─", a:width - 2) ] " 2はsigncolumnの分
	let messageBody = header + rows + quotes->flatten() + stamps + footer
	return #{ body: messageBody, position: #{ quote: quotePos }}
endfunction

function traqvim#view#folded_stamp_text() abort
	let stamps = []
	for l in getline(v:foldstart + 1, v:foldend - 1)
		let stamps += [ matchstr(l, "^:[^:]*:") ]
	endfor
	return stamps->uniq()->join(" ")
endfunction

function traqvim#view#update_message_position(timeline, key, value) abort
	if a:key == 0
		let start = 1
		let mes = traqvim#view#make_message_body(a:value, winwidth(bufwinid("%")))
		let end = start + len(mes.body) - 1
		let a:value.position = #{
					\ index: 0,
					\ start: start,
					\ end: end,
					\ quote: mes.position["quote"]
					\}
	else
		let prev = a:timeline[a:key - 1]
		let start = prev.position["end"] + 1
		let mes = traqvim#view#make_message_body(a:value, winwidth(bufwinid("%")))
		let end = start + len(mes.body) - 1
		let a:value.position = #{
					\ index: a:key,
					\ start: start,
					\ end: end,
					\ quote: mes.position["quote"]
					\}
	endif
	return a:value
endfunction

function traqvim#view#draw_timeline(bufNum) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	call sign_unplace("VtraQ", #{ buffer: a:bufNum })
	" ここでindexの始まりが決定されてる
	let index = 0
	let start = 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	for message in getbufvar(a:bufNum, "channelTimeline")
		let mes = traqvim#view#make_message_body(message, width)
		let end = start + len(mes.body) - 1
		" 一度に全部描画するから、positionをここで設定する
		" TODO: ここでバッファ変数を変更してるのを直す
		let message.position = #{
					\ index: index,
					\ start: start,
					\ end: end,
					\ quote: mes.position["quote"]
					\}
		call setbufline(a:bufNum, start, mes.body)
		if message->get('pinned')
			call sign_place(0, "VtraQ", "pin", a:bufNum, #{ lnum: start, priority: 10 })
			for i in range(start + 1, end - 1)
				call sign_place(0, "VtraQ", "pin_long", a:bufNum, #{ lnum: i, priority: 10 })
			endfor
		endif
		let start = end + 1
		let index = index + 1
	endfor
	call deletebufline(a:bufNum, start, '$')
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

" TODO: 全部を描画しなおすんじゃなくて、フッターだけ再描画したいな
function traqvim#view#redraw_recursive(layout) abort
	if a:layout[0] ==# "leaf"
		let bufNum = winbufnr(a:layout[1])
		if getbufvar(bufNum, "&filetype") ==# "traqvim"
			call traqvim#view#draw_timeline(bufNum)
		endif
	else
		for win in a:layout[1]
			if win[0] ==# "leaf"
				let bufNum = winbufnr(win[1])
				if getbufvar(bufNum, "&filetype") ==# "traqvim"
					call traqvim#view#draw_timeline(bufNum)
				endif
			else
				call traqvim#view#redraw_recursive(win)
			endif
		endfor
	endif
endfunction

function traqvim#view#draw_forward_messages(bufNum, messages) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	" startをバッファの最下値にする
	let start = len(getbufline(a:bufNum, 1, '$')) + 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	for message in a:messages
		let mes = traqvim#view#make_message_body(message, width)
		let end = start + len(mes.body) - 1
		call appendbufline(a:bufNum, start - 1, mes.body)
		if message->get('pinned')
			call sign_place(0, "VtraQ", "pin", a:bufNum, #{ lnum: start, priority: 10 })
			for i in range(start + 1, end - 1)
				call sign_place(0, "VtraQ", "pin_long", a:bufNum, #{ lnum: i, priority: 10 })
			endfor
		endif
		let start = end + 1
	endfor
	" この関数を呼ばれる前に追加分が既にバッファ変数に登録されてる
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	call map(timeline, function("traqvim#view#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#view#draw_back_messages(bufNum, messages) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let start = 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	" appendbufline()を使用する
	for message in a:messages
		let mes = traqvim#view#make_message_body(message, width)
		let end = start + len(mes.body) - 1
		call appendbufline(a:bufNum, start - 1, mes.body)
		if message->get('pinned')
			call sign_place(0, "VtraQ", "pin", a:bufNum, #{ lnum: start, priority: 10 })
			for i in range(start + 1, end - 1)
				call sign_place(0, "VtraQ", "pin_long", a:bufNum, #{ lnum: i, priority: 10 })
			endfor
		endif
		let start = end + 1
	endfor
	" 既存のメッセージのpositionを更新する
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	call map(timeline, function("traqvim#view#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#view#draw_delete_message(bufNum, message) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	" TODO: このstart, endがスタンプの行をどのように考慮してるか確認しとく
	let start = a:message.position["start"]
	let end = a:message.position["end"]
	if a:message->get('pinned')
		call sign_unplace("VtraQ", #{ buffer: a:bufNum, lnum: start })
		for i in range(start + 1, end - 1)
			call sign_unplace("VtraQ", #{ buffer: a:bufNum, lnum: i })
		endfor
	endif
	call deletebufline(a:bufNum, start, end)
	" 既存のメッセージのpositionを更新する
	" この関数を呼ばれる前に削除分が既にバッファ変数から削除されてる
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	call map(timeline, function("traqvim#view#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

" indexの後のmessageを追加
" positionのindexを0-indexか1-indexにするか悩むなぁ…
" 現状は0-indexだから、いったんそれでいく
" これを利用してback, forwadの方のメッセージをhogehogeしたい
function traqvim#view#draw_append_message(bufNum, message) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let prevMessageIndex = 0
	" この関数を呼ばれる前に追加分が既にバッファ変数に登録されてる
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	for message in timeline
		if message.id == a:message.id
			let prevMessageIndex = message.position.index
			break
		endif
	endfor
	let start = 1
	if prevMessageIndex
		let start = timeline->get(prevMessageIndex-1)->get("position")->get("end") + 1
	endif
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	let mes = traqvim#view#make_message_body(a:message, width)
	let end = start + len(mes.body) - 1
	call appendbufline(a:bufNum, start - 1, mes.body)
	if a:message->get('pinned')
		call sign_place(0, "VtraQ", "pin", a:bufNum, #{ lnum: start, priority: 10 })
		for i in range(start + 1, end - 1)
			call sign_place(0, "VtraQ", "pin_long", a:bufNum, #{ lnum: i, priority: 10 })
		endfor
	endif
	" 既存のメッセージのpositionを更新する
	call map(timeline, function("traqvim#view#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#view#draw_message_pin(bufNum, message) abort
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

