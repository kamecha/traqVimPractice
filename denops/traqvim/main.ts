import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import { setupOAuth } from "./oauth.ts";
import {
	channelTimeline,
	channelMessageOptions,
	homeTimeline,
} from "./model.ts";
import { Message } from "./type.d.ts";

export async function main(denops: Denops): Promise<void> {
	// ここにプラグインの処理を記載する
	console.log("Hello Denops!");
	denops.dispatcher = {
		async setup(): Promise<unknown> {
			console.log("setup...");
			return setupOAuth();
		},
		async home(): Promise<unknown> {
			const home = await homeTimeline();
			const bufNum = await denops.call("traqvim#make_buffer", "home", "edit");
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
				home.map((message: Message) => {
					return {
						displayName: message.displayName,
						content: message.content,
						createdAt: message.createdAt.toLocaleDateString(),
					}
				}));
			return;
		},
		async timeline(args: string): Promise<unknown> {
			const timelineOption: channelMessageOptions = {
				channelPath: "#gps/times/kamecha"
			}
			const timeline = await channelTimeline(timelineOption);
			// #gps/times/kamecha → \#gps/times/kamecha
			const escapedChannelName = timelineOption.channelPath.replace("#", "\\#");
			const bufNum = await denops.call("traqvim#make_buffer", escapedChannelName, "edit");
			// await vars.buffers.set(denops, "channelTimeline", timeline);
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
				timeline.map((message: Message) => {
					return {
						displayName: message.displayName,
						content: message.content,
						createdAt: message.createdAt.toLocaleDateString(),
					}
				}));
			return;
		}
	}
};
