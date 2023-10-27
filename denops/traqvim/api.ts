import { oauth2Client, path, traq } from "./deps.ts";

export const baseUrl = "https://q.trap.jp/api/v3";

export class TraqApi {
  private prefix: URL;
  private token: oauth2Client.Tokens | undefined;
  private config: traq.Configuration | undefined;
  public tokenFilePath: string | undefined;
  public _api: traq.Apis | undefined;

  get api(): traq.Apis {
    if (this._api === undefined) {
      this.loadToken();
      if (this._api === undefined) {
        throw new Error("API cannot be initialized");
      }
    }
    return this._api;
  }

  constructor(prefix: URL) {
    this.prefix = prefix;
  }
  setToken(token: oauth2Client.Tokens) {
    this.token = token;
    if (!this.tokenFilePath) {
      throw new Error("Token file is not set");
    }
    // tokenFilePathが存在しない場合は作成
    Deno.mkdir(path.dirname(this.tokenFilePath), { recursive: true });
    // tokenをtokenTmpFileにセット
    Deno.writeTextFile(this.tokenFilePath, JSON.stringify(token));
  }
  loadToken() {
    if (!this.tokenFilePath) {
      throw new Error("Token file is not set");
    }
    const file = Deno.readTextFileSync(this.tokenFilePath);
    this.token = JSON.parse(file);
    if (!this.token) {
      throw new Error("Token file cannot be read");
    }
    this.config = new traq.Configuration({
      accessToken: this.token.accessToken,
    });
    this._api = new traq.Apis(this.config);
  }
  fetchWithToken(
    method: string,
    path: string,
    param?: Record<string, string | boolean>,
    body?: string,
  ): Promise<Response> {
    if (this.token == undefined) {
      // tokenがない場合はtokenTmpFileから読み込む
      this.loadToken();
      if (this.token == undefined) {
        throw new Error("Token file cannot be read");
      }
    }
    // paramのbooleanをstringに変換
    const paramConvert: Record<string, string> = {};
    if (param) {
      for (const [key, value] of Object.entries(param)) {
        if (typeof value === "boolean") {
          paramConvert[key] = value ? "true" : "false";
        } else {
          paramConvert[key] = value;
        }
      }
    }
    const query = new URLSearchParams(paramConvert);
    if (query.toString() !== "") {
      path += "?" + query.toString();
    }
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

export const api: TraqApi = new TraqApi(new URL(baseUrl));
