import Session from "@/session.ts";
import { getItem } from "@/db.ts";

type ErrorResponse = {
    type: "error";
    error: string;
}

export type StartResponse = {
    type: "start";
    id: string;
    scene: SceneResponse;
}

export type SceneResponse = {
    type: "scene";
    value: string,
    options: OptionResponse[],
    items: ItemsResponse,
}

type OptionResponse = {
    locked: boolean;
    value: string;
}

type ItemsResponse = Record<number, ItemResponse>

type ItemResponse = {
    name: string;
    description?: string;
    count: number;
}

export async function getScene(session: Session): Promise<SceneResponse> {
    await session.ready;
    const sceneData = session.scene;
    return {
        type: "scene",
        value: sceneData.value,
        options: sceneData.options.map(option => {
            let locked = false;
            if (option.required_item) {
                locked = !session.items[option.required_item.id];
            }
            return {
                locked,
                value: locked ? "Locked option" : option.value,
            }
        }),
        items: await getItems(session),
    }
}

async function getItems(session: Session): Promise<Record<number, ItemResponse>> {
    const promises = [];
    const result: Record<number, ItemResponse> = {};
    for (const index in session.items) {
        const id = parseInt(index);
        const count = session.items[id];
        promises.push(getItem(id).then(item => {
            result[id] = {
                name: item.name,
                count,
            }
            if (item.description) {
                result[id].description = item.description;
            }
        }));
    }
    for (const promise of promises) {
        await promise;
    }
    return result;
}

export type PlayResponse = ErrorResponse | StartResponse | SceneResponse;

export const handler = async (req: Request) => {
    const data = await req.json();
    let result: PlayResponse = { type: "error", error: "Invalid action" };
    let session: Session;
    if (data.id) {
        session = Session.sessions[data.id];
    } else {
        session = new Session();
    }
    switch (data.action) {
        case "startSession": {
            const id = crypto.randomUUID();
            Session.sessions[id] = session;
            result = {
                type: "start",
                id,
                scene: await getScene(session),
            }
            break;
        }
        case "choose":
            await session.choose(data.option);
            /* falls through */
        case "getScene":
            result = await getScene(session);
            break;
        case "createOption":
            await session.createOption(data.option, data.scene, data.required_item);
            result = await getScene(session);
            break;
        default:
            break;
    }
    return new Response(JSON.stringify(result));
}