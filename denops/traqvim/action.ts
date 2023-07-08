import { Denops, ensureArray, fn, helper, vars } from "./deps.ts";
import { Message } from "./type.d.ts";
import { activity, channelMessageOptions, channelTimeline } from "./model.ts";

export const actionOpenChannel = async (
  denops: Denops,
  channelMessageOptions: channelMessageOptions,
  openCommand?: string,
  bufNum?: number,
): Promise<void> => {
  helper.echo(denops, "actionOpenChannel");
  const timeline: Message[] = await channelTimeline(channelMessageOptions);
  if (channelMessageOptions.channelPath === undefined) {
    helper.echoerr(denops, "channelPath is undefined");
    return;
  }
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
  // 最終行にカーソルを移動する
  const lastLine = await fn.line(denops, "$");
  await fn.cursor(denops, lastLine, 0);
};

// 前にメッセージを追加する
export const actionForwardChannelMessage = async (
  denops: Denops,
  forwardMessages: Message[],
  bufNum: number,
): Promise<void> => {
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  ensureArray<Message>(timeline);
  // 追記したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    timeline.concat(forwardMessages),
  );
  // 描画は追記した部分だけ
  await denops.call("traqvim#draw_forward_messages", bufNum, forwardMessages);
};

// 後ろにメッセージを追加する
export const actionBackChannelMessage = async (
  denops: Denops,
  backMessages: Message[],
  bufNum: number,
): Promise<void> => {
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  ensureArray<Message>(timeline);
  // 追記したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    backMessages.concat(timeline),
  );
  // 一旦全部描画するようにする
  await denops.call("traqvim#draw_timeline", bufNum);
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
