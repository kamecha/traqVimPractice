import {
	Denops,
	vars,
	dduVim,
} from "../traqvim/deps.ts";
import { channelMessageOptions, channelTimeline } from "../traqvim/model.ts";
import { Message } from "../traqvim/type.d.ts";
import { actionOpenChannel } from "../traqvim/action.ts";

export type ActionData = {
	word: string;
};

type Params = Record<never, never>;

type OpenParams = {
	command: string;
};

export class Kind extends dduVim.BaseKind<Params> {
	actions: dduVim.Actions<Params> = {
		open: async (args: {
			denops: Denops;
			actionParams: unknown;
			items: dduVim.DduItem[];
		}) => {
			const params = args.actionParams as OpenParams;
			const openCommand = params.command ?? "edit";
			// ↓ここ配列の先頭しか見ていないので、複数選択されたときにはバグる
			for (const item of args.items) {
				const channelPath: string = item.word;
				const timelineOption: channelMessageOptions = {
					channelPath: channelPath,
				};
				await actionOpenChannel(args.denops, timelineOption, openCommand);
			}
			return dduVim.ActionFlags.None;
		},
	};

	async getPreviewer(
		args: dduVim.GetPreviewerArguments,
	): Promise<dduVim.Previewer | undefined> {
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
						user: message.user,
						content: message.content,
						createdAt: message.createdAt.toLocaleString("ja-JP"),
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
