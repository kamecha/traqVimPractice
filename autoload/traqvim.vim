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

