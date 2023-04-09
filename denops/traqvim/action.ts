import {
	Denops,
	vars,
} from "./deps.ts";
import {
	Message,
} from "./type.d.ts";
import {
	channelTimeline,
	channelMessageOptions,
	activity,
} from "./model.ts";

export const actionOpenChannel = async (
	denops: Denops,
	channelMessageOptions: channelMessageOptions,
	openCommand?: string,
	bufNum?: number,
): Promise<void> => {
	console.log("actionOpenChannel");
	const timeline: Message[] = await channelTimeline(channelMessageOptions);
	const convertedTimeline: Message[] = timeline.map((message: Message) => {
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
		};
	});
	const escapedChannelPath = channelMessageOptions.channelPath.replace("#", "\\#");
	const open= openCommand ?? "edit";
	// const bufNum = await denops.call("traqvim#make_buffer", escapedChannelPath, open);
	const bufN = bufNum ?? await denops.call("traqvim#make_buffer", escapedChannelPath, open);
	await vars.buffers.set(denops, "channelTimeline", convertedTimeline);
	await denops.cmd("setlocal buftype=nofile ft=traqvim nonumber breakindent");
	await denops.call("traqvim#draw_timeline", bufN);
}

export const actionOpenActivity = async (
	denops: Denops,
	bufNum?: number,
): Promise<void> => {
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
	// const bufNum = await denops.call("traqvim#make_buffer", "Activity", "edit");
	const bufN = bufNum ?? await denops.call("traqvim#make_buffer", "Activity", "edit");
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
		bufN,
	);
}
