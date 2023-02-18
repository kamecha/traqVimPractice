import { Tokens } from "https://deno.land/x/oauth2@v0.2.6/mod.ts";
import * as path from "https://deno.land/std@0.177.0/path/mod.ts";
// import { baseUrl } from "./oauth.ts";

export const baseUrl = "https://q.trap.jp/api/v3";

export class TraqApi {
	private prefix: URL;
	private token: Tokens | undefined;
	private tokenFilePath: string;

	constructor(prefix: URL) {
		this.prefix = prefix;
		// tokenをLinuxでの~/.config、Windowsでの該当する箇所に保存する
		this.tokenFilePath = path.join(Deno.env.get("HOME") || "", ".config", "traq", "token.json");
		// tokenFilePathが存在しない場合は作成
		Deno.mkdir(path.dirname(this.tokenFilePath), { recursive: true });
	}
	setToken(token: Tokens) {
		this.token = token;
		// tokenをtokenTmpFileにセット
		Deno.writeTextFile(this.tokenFilePath, JSON.stringify(token));
	}
	async loadToken() {
		if(!this.tokenFilePath)
			throw new Error("Token file is not set");
		const file = await Deno.readTextFile(this.tokenFilePath);
		this.token = JSON.parse(file);
	}
	async fetchWithToken(method: string, path: string, param?: Record<string, string>, body?: string): Promise<Response> {
		if(!this.token) {
			// tokenがない場合はtokenTmpFileから読み込む
			await this.loadToken();
		}
		const query = new URLSearchParams(param);
		if(query.toString() !== "")
			path += "?" + query.toString();
		const encodedPath = encodeURI(path);
		return fetch(this.prefix + encodedPath, {
			method: method,
			headers: {
				"Authorization": "Bearer " + this.token.accessToken,
				"Content-Type": "application/json",
			},
			body: body,
		});
	}
}

export let api: TraqApi = new TraqApi(new URL(baseUrl));
