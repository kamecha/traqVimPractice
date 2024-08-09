import { traq } from "./deps.ts";
import {
  channelMessageOptions,
  channelTimeline,
  channelUUID,
  getStamp,
  getUser,
  homeChannelId,
} from "./model.ts";
import { Message } from "./type.d.ts";
import { api } from "./api.ts";

api.tokenFilePath = "";

let channelId: string;

// $ deno bench --allow-read --allow-net -- --#gps/times/kamecha
if (Deno.args.length > 0) {
  // --#gps/times/kamecha
  const channelPath = Deno.args[0];
  // --#gps/times/kamecha -> ["gps", "times", "kamecha"]
  const channelPathArray = channelPath.slice(3).split("/");
  channelId = await channelUUID(channelPathArray) ?? "";
} else {
  channelId = await homeChannelId();
}

const timelineOption: channelMessageOptions = {
  id: channelId,
  limit: 10,
  until: new Date().toISOString(),
  inclusive: true,
  order: "desc",
};

const messages: Message[] = await channelTimeline(timelineOption);

console.log("messages length:", messages.length);

for (const message of messages) {
  console.log("stamps length:", message.stamps.length);
}

Deno.bench("user & stamp chache", async (b: Deno.BenchContext) => {
  const userCache: Record<string, traq.User> = {};
  const stampCache: Record<string, traq.Stamp> = {};
  b.start();
  for (const message of messages) {
    for (const stamp of message.stamps) {
      if (!stampCache[stamp.stampId]) {
        stampCache[stamp.stampId] = await getStamp(stamp.stampId);
      }
      if (!userCache[stamp.userId]) {
        userCache[stamp.userId] = await getUser(stamp.userId);
      }
    }
  }
  b.end();
});

Deno.bench("stamp cache", async (b: Deno.BenchContext) => {
  const stampCache: Record<string, traq.Stamp> = {};
  b.start();
  for (const message of messages) {
    for (const stamp of message.stamps) {
      if (!stampCache[stamp.stampId]) {
        stampCache[stamp.stampId] = await getStamp(stamp.stampId);
      }
      await getUser(stamp.userId);
    }
  }
  b.end();
});

Deno.bench("user chache", async (b: Deno.BenchContext) => {
  const userCache: Record<string, traq.User> = {};
  b.start();
  for (const message of messages) {
    for (const stamp of message.stamps) {
      await getStamp(stamp.stampId);
      if (!userCache[stamp.userId]) {
        userCache[stamp.userId] = await getUser(stamp.userId);
      }
    }
  }
  b.end();
});

Deno.bench("no chache", async (b: Deno.BenchContext) => {
  b.start();
  for (const message of messages) {
    for (const stamp of message.stamps) {
      await getStamp(stamp.stampId);
      await getUser(stamp.userId);
    }
  }
  b.end();
});
