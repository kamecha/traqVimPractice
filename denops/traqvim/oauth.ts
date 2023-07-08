import { api, baseUrl } from "./api.ts";
import { Denops, fn, helper, oak, oauth2Client } from "./deps.ts";

const oauthConfig: oauth2Client.OAuth2ClientConfig = {
  clientId: "0mlxIRl4fHJTvBYS2DlHIa1H9MdxL4Xsj3au",
  authorizationEndpointUri: `${baseUrl}/oauth2/authorize`,
  tokenUri: `${baseUrl}/oauth2/token`,
};

export class OAuth {
  private app: oak.Application;
  private controller: AbortController;
  private denops: Denops;
  private oauth2client: oauth2Client.OAuth2Client;
  private router: oak.Router;
  constructor(denops: Denops) {
    this.denops = denops;
    this.controller = new AbortController();
    this.app = new oak.Application();
    this.router = new oak.Router();
    this.oauth2client = new oauth2Client.OAuth2Client(oauthConfig);
  }
  async openBrowserWithPlugin(url: string): Promise<unknown> {
    if (
      await fn.exists(this.denops, "g:loaded_openbrowser") ||
      await fn.exists(this.denops, "*openbrowser#open")
    ) {
      return this.denops.call("openbrowser#open", url);
    }
    return;
  }
  async setupOAuth() {
    this.router.get("/oauth2", async (ctx) => {
      ctx.response.redirect(
        (await this.oauth2client.code.getAuthorizationUri({
          disablePkce: true,
        }))
          .uri,
      );
    });
    this.router.get("/oauth2/callback", async (ctx) => {
      const url = new URL(ctx.request.url);
      url.searchParams.append("grant_type", "authorization_code");
      url.searchParams.append("client_id", oauthConfig.clientId);
      try {
        const token = await this.oauth2client.code.getToken(url);
        api.setToken(token);
        // ctx.response.body = "Success";
        this.controller.abort();
      } catch (err) {
        console.error(err);
      }
    });
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
    await this.openBrowserWithPlugin("http://localhost:8000/oauth2");
    helper.echo(this.denops, "Listening on http://localhost:8000/oauth2");
    // listenしてなかったらlistenする
    try {
      if (!this.controller.signal.aborted) {
        this.app.listen({ port: 8000, signal: this.controller.signal });
      }
    } catch (err) {
      console.error(err);
    }
  }
}
