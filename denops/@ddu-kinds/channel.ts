import {
	Actions,
	ActionFlags,
	BaseKind,
	DduItem,
} from "https://deno.land/x/ddu_vim@v1.8.7/types.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.0.0/deps.ts";
import {
	channelTimeline,
	channelMessageOptions,
} from "../traqvim/model.ts";

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
	actions: Actions<Params> = {
		open: async (args: {
			denops: Denops;
			items: DduItem[]
		}) => {
			// ↓ここ配列の先頭しか見ていないので、複数選択されたときにはバグる
			const channelPath: string = args.items[0].word;
			const timelineOption: channelMessageOptions = {
				channelPath: channelPath,
			}
			const timeline = await channelTimeline(timelineOption);
			const escapedChannelPath = channelPath.replace("#", "\\#");
			await args.denops.call("traqvim#make_buffer", escapedChannelPath)
			await vars.buffers.set(args.denops, "channelTimeline", timeline);
			await args.denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await args.denops.call("traqvim#draw_timeline");
			return ActionFlags.None;
		},
	};

	params(): Params {
		return {};
	}
}
