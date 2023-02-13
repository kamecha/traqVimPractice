import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import { setupOAuth } from "./oauth.ts";
import {
	channelTimeline,
	channelMessageOptions,
} from "./model.ts";

export async function main(denops: Denops): Promise<void> {
	// ここにプラグインの処理を記載する
	console.log("Hello Denops!");
	denops.dispatcher = {
		async setup(): Promise<unknown> {
			console.log("setup...");
			return setupOAuth();
		},
		async timeline(): Promise<unknown> {
			const timelineOption: channelMessageOptions = {
				channelPath: "#gps/times/kamecha"
			}
			const timeline = await channelTimeline(timelineOption);
			// #gps/times/kamecha → \#gps/times/kamecha
			const escapedChannelName = timelineOption.channelPath.replace("#", "\\#");
			await denops.call("traqvim#make_buffer", escapedChannelName);
			await vars.buffers.set(denops, "channelTimeline", timeline);
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call("traqvim#draw_timeline");
			return;
		}
	}
};
