import {
	ActionFlags,
	Actions,
	BaseKind,
	DduItem,
	GetPreviewerArguments,
	PreviewContext,
	Previewer,
} from "https://deno.land/x/ddu_vim@v1.8.7/types.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.0.0/deps.ts";
import { channelMessageOptions, channelTimeline } from "../traqvim/model.ts";
import { Message } from "../traqvim/type.d.ts";

export type ActionData = {
	word: string;
};

type Params = Record<never, never>;

type OpenParams = {
	command: string;
};

export class Kind extends BaseKind<Params> {
	actions: Actions<Params> = {
		open: async (args: {
			denops: Denops;
			actionParams: unknown;
			items: DduItem[];
		}) => {
			const params = args.actionParams as OpenParams;
			const openCommand = params.command ?? "edit";
			// ↓ここ配列の先頭しか見ていないので、複数選択されたときにはバグる
			const channelPath: string = args.items[0].word;
			const timelineOption: channelMessageOptions = {
				channelPath: channelPath,
			};
			const timeline = await channelTimeline(timelineOption);
			const escapedChannelPath = channelPath.replace("#", "\\#");
			const bufNum = await args.denops.call(
				"traqvim#make_buffer",
				escapedChannelPath,
				openCommand,
			);
			await args.denops.cmd(
				"setlocal buftype=nofile ft=traqvim nonumber breakindent",
			);
			await args.denops.call(
				"traqvim#draw_timeline",
				bufNum,
				timeline.map((message: Message) => {
					return {
						displayName: message.displayName,
						content: message.content,
						createdAt: message.createdAt.toLocaleTimeString(),
					};
				}));
			return ActionFlags.None;
		},
	};

	async getPreviewer(
		args: GetPreviewerArguments,
	): Promise<Previewer | undefined> {
		const action = args.item as ActionData;
		if (!action) {
			return undefined;
		}
		const channelPath: string = action.word;
		const timelineOption: channelMessageOptions = {
			channelPath: channelPath,
		};
		let previewWidth = args.previewContext.width;
		// sighnColumnやfoldColumn等のtextoff関連を考慮する
		// 今回は確認が面倒なので、とりあえず2を引いている
		previewWidth -= 2;
		const timeline: Message[] = await channelTimeline(timelineOption);
		const timelinePreviewArray: string[][] = await Promise.all(
			timeline.map(async (message: Message) => {
				const ret: string[] = await args.denops.call(
					"traqvim#make_message_body",
					{
						displayName: message.displayName,
						content: message.content,
						createdAt: message.createdAt.toLocaleTimeString(),
					},
					previewWidth,
				);
				return ret;
			}),
		);
		const timelinePreview: string[] = timelinePreviewArray.flat();
		return {
			kind: "nofile",
			contents: timelinePreview,
		};
	}

	params(): Params {
		return {};
	}
}
