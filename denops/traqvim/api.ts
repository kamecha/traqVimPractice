import {
	Tokens,
	path,
	traq,
} from "./deps.ts";

export const baseUrl = "https://q.trap.jp/api/v3";

export class TraqApi {
	private prefix: URL;
	private token: Tokens | undefined;
	private tokenFilePath: string;
	private config: traq.Configuration;
	public api: traq.Apis;

	constructor(prefix: URL) {
		this.prefix = prefix;
		// tokenをLinuxでの~/.config、Windowsでの該当する箇所に保存する
		this.tokenFilePath = path.join(Deno.env.get("HOME") || "", ".config", "traq", "token.json");
		// tokenFilePathが存在しない場合は作成
		Deno.mkdir(path.dirname(this.tokenFilePath), { recursive: true });
		// 既にtokenが記録されているならそれを読み込む
		if(Deno.statSync(this.tokenFilePath).isFile) {
			console.log("token file exists");
			this.loadToken();
		}
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
		this.config = new traq.Configuration({
			accessToken: this.token.accessToken,
			})
		this.api = new traq.Apis(this.config);
		console.log("api loaded");
	}
	async fetchWithToken(method: string, path: string, param?: Record<string, string | boolean>, body?: string): Promise<Response> {
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
