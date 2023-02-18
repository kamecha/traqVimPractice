import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import { setupOAuth } from "./oauth.ts";
import {
	searchChannelUUID,
	channelTimeline,
	channelMessageOptions,
	homeChannelPath,
	homeTimeline,
	activity,
	sendMessage,
} from "./model.ts";
import { Message } from "./type.d.ts";
import {
	ensureString,
	ensureNumber,
} from "https://deno.land/x/unknownutil@v1.0.0/mod.ts";

export async function main(denops: Denops): Promise<void> {
	// ここにプラグインの処理を記載する
	console.log("Hello Denops!");
	denops.dispatcher = {
		async setup(): Promise<unknown> {
			console.log("setup...");
			return setupOAuth(denops);
		},
		async home(): Promise<unknown> {
			const homePath = await homeChannelPath();
			const escapedHomePath = homePath.replace("#", "\\#");
			const home = await homeTimeline();
			const bufNum = await denops.call("traqvim#make_buffer", escapedHomePath, "edit");
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
		async timeline(args: unknown): Promise<unknown> {
			ensureString(args);
			const timelineOption: channelMessageOptions = {
				channelPath: args
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
		},
		async activity(): Promise<unknown> {
			const activityList: Message[] = await activity();
			const bufNum = await denops.call("traqvim#make_buffer", "Activity", "edit");
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
				activityList.map((message: Message) => {
					return {
						displayName: message.displayName,
						content: message.content,
						createdAt: message.createdAt.toLocaleDateString(),
					}
				}));
			return;
		},
		async reload(bufNum: unknown, bufName: unknown): Promise<unknown> {
			// バッファ番号は被らないが、バッファ名は被る可能性がある
			ensureNumber(bufNum);
			ensureString(bufName);
			let timeline: Message[];
			if (bufName === "Activity") {
				timeline = await activity();
			} else {
				const timelineOption: channelMessageOptions = {
					channelPath: bufName
				}
				timeline = await channelTimeline(timelineOption);
			}
			// #gps/times/kamecha → \#gps/times/kamecha
			// const escapedChannelName = timelineOption.channelPath.replace("#", "\\#");
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
		},
		async messageOpen(bufNum: unknown, bufName: unknown): Promise<unknown> {
			ensureNumber(bufNum);
			ensureString(bufName);
			// bufNameの先頭に#がついていなければ、何もしない
			if (bufName[0] !== "#") {
				return;
			}
			const messageBufName = "Message" + bufName.replace("#", "\\#");
			await denops.call("traqvim#make_buffer", messageBufName, "new");
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim-message nonumber breakindent",
			);
			return;
		},
		async messageSend(bufName: unknown, contents: unknown): Promise<unknown> {
			ensureString(bufName);
			console.log("bufName: " + bufName);
			const content = ( contents as string[] ).join("\n");
			console.log("content: " + content);
			// Message\#gps/times/kamecha → #gps/times/kamecha
			const channelPath = bufName.replace("Message#", "#");
			console.log("channelPath: " + channelPath);
			const channelUUID = await searchChannelUUID(channelPath);
			console.log("channelUUID: " + channelUUID);
			await sendMessage(channelUUID, content);
			await denops.cmd(":bdelete");
			return;
		}
	}
};
