import {
  dduVim,
  dduVimSource,
  Denops,
  ensureString,
  helper,
  vars,
} from "../traqvim/deps.ts";
import { ActionData } from "../@ddu-kinds/channel.ts";
import { channelsRecursive, searchChannelUUID } from "../traqvim/model.ts";
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
        const rootPath = args.sourceOptions.path;
        // #gps/times/kamecha から対象のChannelIDを抽出
        let rootId: string = rootPath === "VtraQ" ? "VtraQ" : "";
        if (rootId === "") {
          rootId = await searchChannelUUID(rootPath);
        }
        const tree = async (rootId: string) => {
          const items: dduVim.Item<ActionData>[] = [];
          const channels: Channel[] = await channelsRecursive();
          // 一番上の階層対応
          if (rootId === "VtraQ") {
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
                treePath: channel.path,
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
              treePath: childrenChannel.path,
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
