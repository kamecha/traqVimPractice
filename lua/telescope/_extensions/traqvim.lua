local pickers = require "telescope.pickers"
local finders = require "telescope.finders"
local actions = require "telescope.actions"
local action_state = require "telescope.actions.state"
local previewers = require "telescope.previewers"
local conf = require("telescope.config").values

local channel_rec = function()
	local channels = vim.fn["denops#request"]('traqvim', 'channelList', {})
	return channels
end

return require("telescope").register_extension {
	exports = {
		traqvim = function(opts)
			opts = opts or {}
			pickers.new(opts, {
				prompt_title = "channel",
				finder = finders.new_table {
					results = channel_rec(),
					entry_maker = function(entry)
						return {
							value = entry,
							display = entry["path"],
							ordinal = entry["path"],
						}
					end,
				},
				sorter = conf.generic_sorter(opts),
				attach_mappings = function(prompt_bufnr, _)
					actions.select_default:replace(function()
						actions.close(prompt_bufnr)
						local selection = action_state.get_selected_entry()
						local action = selection["value"]
						local path = action["path"]
						vim.fn["denops#request"]('traqvim', 'timeline', { path })
					end)
					return true
				end,
				previewer = previewers.new_buffer_previewer({
					define_preview = function(self, entry, _)
						local value = entry["value"]
						local option = {
							id = value["id"],
							limit = vim.g["traqvim#fetch_limit"],
						}
						vim.fn.setbufvar(self.state.bufnr, "&filetype", "traqvim")
						local timeline = vim.fn["denops#request"]('traqvim', 'channelMessage', { option })
						local start_line = 1
						for _, v in ipairs(timeline) do
							local width = vim.fn.winwidth(self.state.winid)
							local mes = vim.fn["traqvim#view#make_message_body"](v, width)
							vim.fn.setbufline(self.state.bufnr, start_line, mes["body"])
							start_line = start_line + #mes["body"]
						end
					end,
					title = "timeline preview",
				}),
			}):find()
		end
	},
}
