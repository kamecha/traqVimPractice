import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { setupOAuth } from "./oauth.ts";

export async function main(denops: Denops): Promise<void> {
  // ここにプラグインの処理を記載する
  console.log("Hello Denops!");
  denops.dispatcher = {
	  async setup(): Promise<unknown> {
		  console.log("setup...");
		  return setupOAuth();
	  }
  }
};
