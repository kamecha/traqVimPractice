import { Denops, vars } from "./deps.ts";
import { Message } from "./type.d.ts";
import { activity, channelMessageOptions, channelTimeline } from "./model.ts";

export const actionOpenChannel = async (
  denops: Denops,
  channelMessageOptions: channelMessageOptions,
  openCommand?: string,
  bufNum?: number,
): Promise<void> => {
  console.log("actionOpenChannel");
  const timeline: Message[] = await channelTimeline(channelMessageOptions);
  const escapedChannelPath = channelMessageOptions.channelPath.replace(
    "#",
    "\\#",
  );
  const open = openCommand ?? "edit";
  const bufN = bufNum ??
    await denops.call("traqvim#make_buffer", escapedChannelPath, open);
  await vars.buffers.set(denops, "channelTimeline", timeline);
  await denops.cmd("setlocal buftype=nofile ft=traqvim nonumber breakindent");
  await denops.call("traqvim#draw_timeline", bufN);
};

export const actionOpenActivity = async (
  denops: Denops,
  bufNum?: number,
): Promise<void> => {
  const activityList: Message[] = await activity();
  const bufN = bufNum ??
    await denops.call("traqvim#make_buffer", "Activity", "edit");
  await vars.buffers.set(
    denops,
    "channelTimeline",
    activityList,
  );
  await denops.cmd(
    "setlocal buftype=nofile ft=traqvim nonumber breakindent",
  );
  await denops.call(
    "traqvim#draw_timeline",
    bufN,
  );
};
