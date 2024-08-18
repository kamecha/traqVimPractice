import { assert, bufname, Denops, fn, helper, is, vars } from "./deps.ts";
import { ChannelBuffer, Message } from "./type.d.ts";
import {
  activity,
  addMessageStamp,
  channelMessageOptions,
  channelPath,
  channelTimeline,
  createPin,
  deleteMessage,
  editMessage,
  getMessageStamps,
  removePin,
} from "./model.ts";
import { isMessage } from "./type_check.ts";

export const actionOpenChannel = async (
  denops: Denops,
  channelMessageOptions: channelMessageOptions,
  message?: Message,
  bufNum?: number,
): Promise<void> => {
  helper.echo(denops, "actionOpenChannel");
  const timeline: Message[] = await channelTimeline(channelMessageOptions);
  if (channelMessageOptions.channelPath === undefined) {
    channelMessageOptions.channelPath = await channelPath(
      channelMessageOptions.id,
    );
  }
  const escapedChannelPath = bufname.format({
    scheme: "VtraQ",
    expr: "/Channel",
    params: message ? { message: message.id } : undefined,
    fragment: channelMessageOptions.channelPath.replace("#", ""),
  });
  const channelBufferVars: ChannelBuffer = {
    channelID: channelMessageOptions.id,
    channelPath: escapedChannelPath,
    channelTimeline: timeline,
  };
  const bufN = bufNum ??
    await fn.bufnr(denops, escapedChannelPath, true);
  await denops.cmd(`noswapfile buffer ${bufN}`);
  await vars.buffers.set(denops, "channelID", channelBufferVars.channelID);
  await vars.buffers.set(denops, "channelPath", channelBufferVars.channelPath);
  await vars.buffers.set(
    denops,
    "channelTimeline",
    channelBufferVars.channelTimeline,
  );
  await denops.cmd("setlocal buftype=nofile ft=traqvim nonumber breakindent");
  await denops.call("traqvim#view#draw_timeline", bufN);
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
  assert(timeline, is.ArrayOf(isMessage));
  // 追記したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    timeline.concat(forwardMessages),
  );
  // 描画は追記した部分だけ
  await denops.call(
    "traqvim#view#draw_forward_messages",
    bufNum,
    forwardMessages,
  );
};

// 後ろにメッセージを追加する
export const actionBackChannelMessage = async (
  denops: Denops,
  backMessages: Message[],
  bufNum: number,
): Promise<void> => {
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  assert(timeline, is.ArrayOf(isMessage));
  // 追記したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    backMessages.concat(timeline),
  );
  // 一旦全部描画するようにする
  await denops.call("traqvim#view#draw_back_messages", bufNum, backMessages);
};

export const actionDeleteMessage = async (
  denops: Denops,
  message: Message,
  bufNum: number,
): Promise<void> => {
  try {
    await deleteMessage(message.id);
  } catch (e) {
    console.error(e);
    return;
  }
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  assert(timeline, is.ArrayOf(isMessage));
  // 削除したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    timeline.filter((m) => m.id !== message.id),
  );
  await denops.call("traqvim#view#draw_delete_message", bufNum, message);
};

export const actionEditMessage = async (
  denops: Denops,
  message: Message,
  content: string,
  bufNum: number,
): Promise<void> => {
  try {
    await editMessage(message.id, content);
  } catch (e) {
    console.error(e);
    return;
  }
  // 既存メッセージの取得
  // const timeline = await vars.buffers.get(denops, "channelTimeline");
  const timeline = await fn.getbufvar(denops, bufNum, "channelTimeline");
  assert(timeline, is.ArrayOf(isMessage));
  // 削除したものをセット
  await fn.setbufvar(
    denops,
    bufNum,
    "channelTimeline",
    timeline.filter((m) => m.id !== message.id),
  );
  await denops.call(
    "traqvim#view#draw_delete_message",
    bufNum,
    message,
  );
  // 編集したものを追記
  const editedTimeline = timeline.map((m) => {
    if (m.id === message.id) {
      return {
        ...m,
        content: content,
      };
    } else {
      return m;
    }
  });
  await fn.setbufvar(
    denops,
    bufNum,
    "channelTimeline",
    editedTimeline,
  );
  await denops.call(
    "traqvim#view#draw_append_message",
    bufNum,
    editedTimeline.find((m) => m.id === message.id),
  );
};

export const actionOpenActivity = async (
  denops: Denops,
  bufNum?: number,
): Promise<void> => {
  const activityList: Message[] = await activity();
  const activityPath = bufname.format({
    scheme: "VtraQ",
    expr: "/Activity",
  });
  const bufN = bufNum ??
    await fn.bufnr(denops, activityPath, true);
  await denops.cmd(`noswapfile buffer ${bufN}`);
  await vars.buffers.set(
    denops,
    "channelTimeline",
    activityList,
  );
  await denops.cmd(
    "setlocal buftype=nofile ft=traqvim nonumber breakindent",
  );
  await denops.call(
    "traqvim#view#draw_timeline",
    bufN,
  );
};

export const actionYankMessageLink = async (
  denops: Denops,
  message: Message,
): Promise<void> => {
  const messageLink = `https://q.trap.jp/messages/${message.id}`;
  await fn.setreg(denops, '"', messageLink);
  await helper.echo(denops, "Yanked message link");
};

export const actionYankMessageMarkdown = async (
  denops: Denops,
  message: Message,
): Promise<void> => {
  await fn.setreg(denops, '"', message.content);
  await helper.echo(denops, "Yanked message markdown");
};

export const actionCreatePin = async (
  denops: Denops,
  message: Message,
  bufNum: number,
): Promise<void> => {
  try {
    await createPin(message.id);
  } catch (e) {
    console.error(e);
    return;
  }
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  assert(timeline, is.ArrayOf(isMessage));
  message.pinned = true;
  // ピン留めしたものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    timeline.map((m) => {
      if (m.id === message.id) {
        return message;
      } else {
        return m;
      }
    }),
  );
  await denops.call("traqvim#view#draw_message_pin", bufNum, message);
};

export const actionRemovePin = async (
  denops: Denops,
  message: Message,
  bufNum: number,
): Promise<void> => {
  try {
    await removePin(message.id);
  } catch (e) {
    console.error(e);
    return;
  }
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  assert(timeline, is.ArrayOf(isMessage));
  message.pinned = false;
  // ピン留め解除したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    timeline.map((m) => {
      if (m.id === message.id) {
        return message;
      } else {
        return m;
      }
    }),
  );
  await denops.call("traqvim#view#draw_message_pin", bufNum, message);
};

export const actionAddMessageStamp = async (
  denops: Denops,
  message: Message,
  stamp: string,
  bufNum: number,
): Promise<void> => {
  try {
    await addMessageStamp(message.id, stamp);
  } catch (e) {
    console.error(e);
    return;
  }
  // 既存メッセージの取得
  const timeline = await vars.buffers.get(denops, "channelTimeline");
  assert(timeline, is.ArrayOf(isMessage));
  // 一旦対象メッセージを削除する
  await vars.buffers.set(
    denops,
    "channelTimeline",
    timeline.filter((m) => m.id !== message.id),
  );
  await denops.call("traqvim#view#draw_delete_message", bufNum, message);
  // 更新されたメッセージにあるスタンプを取得
  const updatedMessage = await getMessageStamps(message.id);
  const editedTimeline = timeline.map((m) => {
    if (m.id === message.id) {
      return {
        ...m,
        stamps: updatedMessage
      };
    } else {
      return m;
    }
  });
  // 編集したものをセット
  await vars.buffers.set(
    denops,
    "channelTimeline",
    editedTimeline,
  );
  await denops.call(
    "traqvim#view#draw_append_message",
    bufNum,
    editedTimeline.find((m) => m.id === message.id),
  );
}
