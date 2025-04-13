import { FreshContext } from "$fresh/server.ts";

export async function handler(
    req: Request,
    ctx: FreshContext
) {
    const url = new URL(req.url);
    if(!url.pathname.startsWith("/_frsh/")) {
        console.log(req.method, url.pathname);
    }
    const response = await ctx.next();
    return response;
}
