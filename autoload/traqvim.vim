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

