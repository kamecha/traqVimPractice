import { Tokens } from "https://deno.land/x/oauth2@v0.2.6/mod.ts";

export class TraqApi {
	private prefix: URL;
	private token: Tokens | undefined;

	constructor(prefix: URL) {
		this.prefix = prefix;
	}
	setToken(token: Tokens) {
		this.token = token;
	}
	fetchWithToken(method: string, path: string, param?: Record<string, string>): Promise<Response> {
		if(!this.token)
			throw new Error("Token is not set");
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

export let api: TraqApi = new TraqApi(new URL("https://q.trap.jp/api/v3"));
