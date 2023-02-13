import { Application, Router } from "https://deno.land/x/oak@v6.3.0/mod.ts";
import { OAuth2Client, OAuth2ClientConfig } from "https://deno.land/x/oauth2_client/mod.ts";
import { TraqApi, api, baseUrl } from "./api.ts";

const oauthConfig: OAuth2ClientConfig = {
	clientId: "82zhMANtECcrqXjGq012B6mQrCfHpr1y4rfJ",
	authorizationEndpointUri: `${baseUrl}/oauth2/authorize`,
	tokenUri: `${baseUrl}/oauth2/token`,
}

const oauth2Client = new OAuth2Client(oauthConfig);

const app = new Application();
const controller = new AbortController();
const { signal } = controller;

export const setupOAuth = async (): Promise<unknown> => {
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
	const server = await app.listen({ port: 8000, signal });
	return await server;
}
