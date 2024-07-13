" バッファ変数の情報を元に描画する関数郡

function traqvim#view#draw_timeline(bufNum) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	call sign_unplace("VtraQ", #{ buffer: a:bufNum })
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
		let body = traqvim#make_message_body(message, width)
		let end = start + len(body) - 1
		call appendbufline(a:bufNum, start - 1, body)
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
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#view#draw_back_messages(bufNum, messages) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
	let start = 1
	let winnr = bufwinid(a:bufNum)
	let width = winwidth(winnr)
	" appendbufline()を使用する
	for message in a:messages
		let body = traqvim#make_message_body(message, width)
		let end = start + len(body) - 1
		call appendbufline(a:bufNum, start - 1, body)
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
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

function traqvim#view#draw_delete_message(bufNum, message) abort
	call setbufvar(a:bufNum, "&modifiable", 1)
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
	call map(timeline, function("traqvim#update_message_position", [timeline]))
	call setbufvar(a:bufNum, "&modifiable", 0)
endfunction

