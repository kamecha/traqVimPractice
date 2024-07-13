
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
