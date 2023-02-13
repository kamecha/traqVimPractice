import { Tokens } from "https://deno.land/x/oauth2@v0.2.6/mod.ts";
import * as path from "https://deno.land/std@0.177.0/path/mod.ts";
// import { baseUrl } from "./oauth.ts";

export const baseUrl = "https://q.trap.jp/api/v3";

export class TraqApi {
	private prefix: URL;
	private token: Tokens | undefined;
	private tokenTmpFile: string;

	constructor(prefix: URL) {
		this.prefix = prefix;
		this.tokenTmpFile = path.join(Deno.cwd(), "token.json");
	}
	setToken(token: Tokens) {
		this.token = token;
		// tokenをtokenTmpFileにセット
		Deno.writeTextFile(this.tokenTmpFile, JSON.stringify(token));
	}
	async loadToken() {
		if(!this.tokenTmpFile)
			throw new Error("Token file is not set");
		const file = await Deno.readTextFile(this.tokenTmpFile);
		this.token = JSON.parse(file);
	}
	async fetchWithToken(method: string, path: string, param?: Record<string, string>): Promise<Response> {
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
			}
		});
	}
}

export let api: TraqApi = new TraqApi(new URL(baseUrl));
