import { dduVim, Denops } from "../traqvim/deps.ts";
import { ActionData } from "../@ddu-kinds/channel.ts";
import { channelsRecursive, getUnreadChannels } from "../traqvim/model.ts";
import { Channel, UnreadChannel } from "../traqvim/type.d.ts";

type Params = {
  type: "all" | "unread";
};

export class Source extends dduVim.BaseSource<Params> {
  kind = "channel";
  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<dduVim.Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        console.log("start");
        const channels: Channel[] = await channelsRecursive();
        const unreadChannels: UnreadChannel[] = await getUnreadChannels();
        const items: dduVim.Item<ActionData>[] = channels
          .filter((channel: Channel) => {
            switch (args.sourceParams.type) {
              case "all":
                return true;
              case "unread":
                return unreadChannels.some((c) => c.channelId === channel.id);
            }
          })
          .map((channel: Channel) => {
            return {
              word: channel.path,
              action: {
                id: channel.id,
              },
            };
          });
        console.log(items);
        controller.enqueue(items);
        controller.close();
      },
    });
  }
  params(): Params {
    return {
      type: "all",
    };
  }
}