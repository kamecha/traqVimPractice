
function traqvim#message#get_message_buf(curline, bufNum) abort
	let timeline = getbufvar(a:bufNum, "channelTimeline")
	let message = copy(timeline)->filter({ _, v -> v.position["start"] <= a:curline && a:curline <= v.position["end"] })
	if len(message) == 0
		return {}
	endif
	return message[0]
endfunction

function traqvim#message#get_message() abort
	let curline = line(".")
	return traqvim#message#get_message_buf(curline, bufnr("%"))
endfunction

function traqvim#message#get_message_quote() abort
	let curline = line(".")
	let message = traqvim#message#get_message_buf(curline, bufnr("%"))
	let quote = message->get("quote", [])
	if empty(quote)
		return {}
	endif
	let quotePos = copy(message)->get("position")->get("quote", [])
	if empty(quotePos)
		return {}
	endif
	let relativePos = curline - message.position["start"]
	silent let quotePos->filter({ _, v -> v.start <= relativePos && relativePos <= v.end })
	if len(quotePos) == 0
		return {}
	else
		return quote[quotePos[0]->get("index")]
	endif
endfunction

function traqvim#message#message_prev() abort
	let cur = traqvim#message#get_message()
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

function traqvim#message#message_next() abort
	let cur = traqvim#message#get_message()
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

function traqvim#message#goto_message() abort
	let message = traqvim#message#get_message()
	if empty(message)
		return
	endif
	let quote = traqvim#message#get_message_quote()
	call denops#request('traqvim', 'timelineMessage', [quote != #{} ? quote : message])
endfunction

function traqvim#message#registerYankMessageLink() abort
	let &opfunc = function('traqvim#message#yankMessageLink')
	return 'g@'
endfunction

function traqvim#message#yankMessageLink(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#message#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#message#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	let messageLink = "https://q.trap.jp/messages/" . messageStart->get('id')
	call setreg(v:register, messageLink)
endfunction

function traqvim#message#registerYankMessageMarkdown() abort
	let &opfunc = function('traqvim#message#yankMessageMarkdown')
	return 'g@'
endfunction

function traqvim#message#yankMessageMarkdown(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#message#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#message#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	call setreg(v:register, messageStart->get('content'))
endfunction

function traqvim#message#registerDeleteMessage() abort
	let &opfunc = function('traqvim#message#deleteMessage')
	return 'g@'
endfunction

function traqvim#message#deleteMessage(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#message#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#message#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	call denops#request('traqvim', 'messageDelete', [bufnr(), messageStart])
endfunction

function traqvim#message#registerTogglePin() abort
	let &opfunc = function('traqvim#message#togglePin')
	return 'g@'
endfunction

function traqvim#message#togglePin(t) abort
	if a:t != 'line'
		return
	endif
	let messageStart = traqvim#message#get_message_buf(line("'["), bufnr('%'))
	let messageEnd = traqvim#message#get_message_buf(line("']"), bufnr('%'))
	if messageStart->get('id') != messageEnd->get('id')
		return
	endif
	if messageStart->get('pinned')
		call denops#request('traqvim', 'removePin', [bufnr(), messageStart])
	else
		call denops#request('traqvim', 'createPin', [bufnr(), messageStart])
	endif
endfunction

function traqvim#message#message_motion() abort
	let position = traqvim#message#get_message()->get('position')
	call cursor(position->get('start'), 1)
	normal! V
	call cursor(position->get('end'), 1)
endfunction

