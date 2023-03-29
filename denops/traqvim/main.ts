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
	Denops,
	vars,
	ensureString,
	ensureNumber
} from "./deps.ts";

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
			const convertedHome = home.map((message: Message) => {
				return {
					user: message.user,
					content: message.content,
					createdAt: message.createdAt.toLocaleString("ja-JP"),
					quote: message.quote?.map((quote: Message) => {
						return {
							user: quote.user,
							content: quote.content,
							createdAt: quote.createdAt.toLocaleString("ja-JP"),
						}
					})
				}
			});
			const bufNum = await denops.call("traqvim#make_buffer", escapedHomePath, "edit");
			await vars.buffers.set(
				denops,
				"channelTimeline",
				convertedHome
			);
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
			);
			return;
		},
		async timeline(args: unknown): Promise<unknown> {
			ensureString(args);
			// argsが"#gps/times/kamecha(1)"のようになっていた場合"(1)"を削除する
			const channelPath = args.replace(/\(\d+\)$/, "");
			const timelineOption: channelMessageOptions = {
				channelPath: channelPath
			}
			const timeline = await channelTimeline(timelineOption);
			// #gps/times/kamecha → \#gps/times/kamecha
			const escapedChannelName = timelineOption.channelPath.replace("#", "\\#");
			const bufNum = await denops.call("traqvim#make_buffer", escapedChannelName, "edit");
			const convertedTimeline = timeline.map((message: Message) => {
				return {
					user: message.user,
					content: message.content,
					createdAt: message.createdAt.toLocaleString("ja-JP"),
					quote: message.quote?.map((quote: Message) => {
						return {
							user: quote.user,
							content: quote.content,
							createdAt: quote.createdAt.toLocaleString("ja-JP"),
						}
					})
				}
			});
			await vars.buffers.set(
				denops,
				"channelTimeline",
				convertedTimeline,
			);
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
			);
			return;
		},
		async activity(): Promise<unknown> {
			const activityList: Message[] = await activity();
			const convertedActivity = activityList.map((message: Message) => {
				return {
					user: message.user,
					content: message.content,
					// TODO: DateStringかTimeStringに揃える
					createdAt: message.createdAt.toLocaleString("ja-JP"),
					quote: message.quote?.map((quote: Message) => {
						return {
							user: quote.user,
							content: quote.content,
							createdAt: quote.createdAt.toLocaleString("ja-JP"),
						}
					})
				}
			});
			const bufNum = await denops.call("traqvim#make_buffer", "Activity", "edit");
			await vars.buffers.set(
				denops,
				"channelTimeline",
				convertedActivity,
			);
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
			);
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
				// バッファが"#gps/times/kamecha(1)"のように"(1)"がついている場合、
				// それを削除する
				const bufNameWithoutNumber = bufName.replace(/\(\d+\)$/, "");
				const timelineOption: channelMessageOptions = {
					channelPath: bufNameWithoutNumber
				}
				timeline = await channelTimeline(timelineOption);
			}
			const convertedTimeline = timeline.map((message: Message) => {
				return {
					user: message.user,
					content: message.content,
					createdAt: message.createdAt.toLocaleString("ja-JP"),
					quote: message.quote?.map((quote: Message) => {
						return {
							user: quote.user,
							content: quote.content,
							createdAt: quote.createdAt.toLocaleString("ja-JP"),
						}
					})
				}
			});
			await vars.buffers.set(
				denops,
				"channelTimeline",
				convertedTimeline,
			);
			await denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await denops.call(
				"traqvim#draw_timeline",
				bufNum,
			);
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
			const content = (contents as string[]).join("\n");
			console.log("content: " + content);
			// Message\#gps/times/kamecha → #gps/times/kamecha
			let channelPath = bufName.replace("Message#", "#");
			// #gps/times/kamecha(1) → #gps/times/kamecha
			channelPath = channelPath.replace(/\(\d+\)$/, "");
			console.log("channelPath: " + channelPath);
			const channelUUID = await searchChannelUUID(channelPath);
			console.log("channelUUID: " + channelUUID);
			await sendMessage(channelUUID, content);
			await denops.cmd(":bdelete");
			return;
		}
	}
};
