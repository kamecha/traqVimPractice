import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { Application, Router } from "https://deno.land/x/oak@v6.3.0/mod.ts";
import { OAuth2Client, OAuth2ClientConfig } from "https://deno.land/x/oauth2_client/mod.ts";
import { TraqApi, api, baseUrl } from "./api.ts";
import * as fn from "https://deno.land/x/denops_std@v3.3.2/function/mod.ts";

const oauthConfig: OAuth2ClientConfig = {
	clientId: "0mlxIRl4fHJTvBYS2DlHIa1H9MdxL4Xsj3au",
	authorizationEndpointUri: `${baseUrl}/oauth2/authorize`,
	tokenUri: `${baseUrl}/oauth2/token`,
}

const oauth2Client = new OAuth2Client(oauthConfig);

const app = new Application();
const controller = new AbortController();
const { signal } = controller;

async function openBrowserWithPlugin(denops: Denops, url: string): Promise<unknown> {
	if (
		await fn.exists(denops, "g:loaded_openbrowser") ||
		await fn.exists(denops, "*openbrowser#open")
	) {
		return denops.call("openbrowser#open", url);
	}
	return;
}

export const setupOAuth = async (denops: Denops): Promise<unknown> => {
	const router = new Router();
	router.get("/oauth2", async (ctx) => {
		ctx.response.redirect(
			(await oauth2Client.code.getAuthorizationUri({ disablePkce: true })).uri
		)
	});
	router.get("/oauth2/callback", async (ctx) => {
		const url = new URL(ctx.request.url);
		url.searchParams.append("grant_type", "authorization_code");
		url.searchParams.append("client_id", oauthConfig.clientId);
		try {
			const token = await oauth2Client.code.getToken(url);
			api.setToken(token);
			// ctx.response.body = "Success";
			controller.abort();
		} catch (err) {
			console.error(err);
		}
	});
	app.use(router.routes());
	app.use(router.allowedMethods());
	await openBrowserWithPlugin(denops, "http://localhost:8000/oauth2");
	await app.listen({ port: 8000, signal });
	return;
}
