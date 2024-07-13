
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

