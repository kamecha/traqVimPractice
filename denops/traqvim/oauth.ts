import { TraqApi, api, baseUrl } from "./api.ts";
import {
	Denops,
	oak,
	oauth2Client,
	fn
} from "./deps.ts";

const oauthConfig: oauth2Client.OAuth2ClientConfig = {
	clientId: "0mlxIRl4fHJTvBYS2DlHIa1H9MdxL4Xsj3au",
	authorizationEndpointUri: `${baseUrl}/oauth2/authorize`,
	tokenUri: `${baseUrl}/oauth2/token`,
}

const oauth2client = new oauth2Client.OAuth2Client(oauthConfig);

const app = new oak.Application();
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
	const router = new oak.Router();
	router.get("/oauth2", async (ctx) => {
		ctx.response.redirect(
			(await oauth2client.code.getAuthorizationUri({ disablePkce: true })).uri
		)
	});
	router.get("/oauth2/callback", async (ctx) => {
		const url = new URL(ctx.request.url);
		url.searchParams.append("grant_type", "authorization_code");
		url.searchParams.append("client_id", oauthConfig.clientId);
		try {
			const token = await oauth2client.code.getToken(url);
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
