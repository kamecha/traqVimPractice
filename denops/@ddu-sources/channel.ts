import {
  dduVim,
  dduVimSource,
  Denops,
  ensureString,
  helper,
  vars,
} from "../traqvim/deps.ts";
import { ActionData } from "../@ddu-kinds/channel.ts";
import { channelsRecursive } from "../traqvim/model.ts";
import { Channel } from "../traqvim/type.d.ts";
import { api } from "../traqvim/api.ts";

type Params = Record<never, never>;

export class Source extends dduVim.BaseSource<Params> {
  kind = "channel";
  async onInit(args: dduVimSource.OnInitArguments<Params>): Promise<void> {
    const path = await vars.globals.get(args.denops, "traqvim#token_file_path");
    ensureString(path);
    api.tokenFilePath = path;
    return Promise.resolve();
  }
  override gather(args: {
    denops: Denops;
    sourceOptions: dduVim.SourceOptions;
  }): ReadableStream<dduVim.Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const rootId = args.sourceOptions.path;
        const tree = async (rootId: string) => {
          const items: dduVim.Item<ActionData>[] = [];
          const channels: Channel[] = await channelsRecursive();
          // 一番上の階層対応
          if (rootId === "") {
            const parentChannels = channels.filter((channel: Channel) => {
              return channel.parentId === null;
            });
            parentChannels.forEach((channel: Channel) => {
              items.push({
                word: channel.path + (channel.children.length === 0 ? "" : "/"),
                action: {
                  id: channel.id,
                },
                isTree: true,
                treePath: channel.id,
              });
            });
            return items;
          }
          const rootChannel = channels.find((channel: Channel) => {
            return channel.id === rootId;
          });
          if (rootChannel === undefined) {
            helper.echoerr(args.denops, `Channel ${rootId} not found`);
            return [];
          }
          rootChannel.children.forEach((id: string) => {
            const childrenChannel = channels.find((channel: Channel) => {
              return channel.id === id;
            });
            if (childrenChannel === undefined) {
              return;
            }
            items.push({
              word: (childrenChannel.path.split("/").pop() ?? "") +
                (childrenChannel.children.length === 0 ? "" : "/"),
              action: {
                id: childrenChannel.id,
              },
              isTree: childrenChannel.children.length !== 0,
              treePath: childrenChannel.id,
            });
          });
          return items;
        };
        controller.enqueue(
          await tree(rootId),
        );
        controller.close();
      },
    });
  }
  params(): Params {
    return {};
  }
}
