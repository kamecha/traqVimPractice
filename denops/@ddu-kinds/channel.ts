import {
  dduVim,
  Denops,
  ensureArray,
  ensureNumber,
  vars,
} from "../traqvim/deps.ts";
import { channelMessageOptions, channelTimeline } from "../traqvim/model.ts";
import { actionOpenChannel } from "../traqvim/action.ts";
import { Message } from "../traqvim/type.d.ts";

export interface ActionData {
  id: string;
}

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
      for (const item of args.items) {
        if (!item.action) {
          continue;
        }
        const action = item.action as ActionData;
        const channelPath: string = item.word;
        const channelID: string = action.id;
        const limit = await vars.globals.get(
          args.denops,
          "traqvim#fetch_limit",
        );
        ensureNumber(limit);
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: channelPath,
          limit: limit,
          until: new Date().toISOString(),
          order: "desc",
        };
        const params = args.actionParams as OpenParams;
        if (params.command) {
          await args.denops.cmd(params.command);
        }
        await actionOpenChannel(args.denops, timelineOption);
      }
      return dduVim.ActionFlags.None;
    },
  };

  async getPreviewer(
    args: {
      denops: Denops;
      previewContext: dduVim.PreviewContext;
      actionParams: unknown;
      item: dduVim.DduItem;
    },
  ): Promise<dduVim.Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return undefined;
    }
    const timelineOption: channelMessageOptions = {
      id: action.id,
    };
    const timeline: Message[] = await channelTimeline(timelineOption);
    const timelinePreviewArray: string[][] = await Promise.all(
      timeline.map(async (message: Message) => {
        const ret = await args.denops.call(
          "traqvim#make_message_body",
          message,
          args.previewContext.width,
        );
        ensureArray<string>(ret);
        return ret;
      }),
    );
    const timelinePreview: string[] = timelinePreviewArray.flat();
    return {
      kind: "nofile",
      contents: timelinePreview,
      syntax: "traqvim",
    };
  }

  params(): Params {
    return {};
  }
}
