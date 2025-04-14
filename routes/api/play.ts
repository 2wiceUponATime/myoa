import { createItem, createScene, ID, ItemMap, Items, Option, Scene, start } from "@/lib/db.ts";
import Session from "@/lib/session.ts";

type ErrorResponse = {
    type: "error";
    message: string;
}

type NewSessionResponse = {
    type: "newSession";
    id: ID;
    scene: SceneResponse;
}

export type SceneResponse = {
    type: "getScene";
    id: ID;
    value: string;
    options: OptionResponse[];
    items: Items;
    itemMap: ItemMap
}

type OptionResponse = {
    locked: boolean;
    value: string;
};

export type PlayResponse = ErrorResponse | SceneResponse | NewSessionResponse;

async function getSceneResponse(session: Session): Promise<SceneResponse> {
    const scene = session.scene;
    let options: OptionResponse[];
    if (scene.options.length == 1 && session.scene.id != start) {
        options = [{
            locked: true,
            value: "Locked option",
        }]
    } else {
        options = scene.options.map(option => {
            if (session.has(option.requiredItems)) {
                return {
                    locked: false,
                    value: option.value,
                }
            } else {
                return {
                    locked: true,
                    value: "Locked option",
                }
            }
        })
    }
    return {
        type: "getScene",
        id: scene.id,
        value: scene.value,
        items: session.items,
        itemMap: await session.getItems(),
        options,
    }
}

export type OptionRequest = {
    action: "newOption";
    session: ID;
    newItems: ItemMap;
    newScenes: Record<ID, Scene>;
    option: Option;
}

export type RequestData = {
    action: "newSession";
} | {
    action: "chooseOption";
    session: ID;
    option: number;
} | {
    action: "getScene";
    session: ID;
} | OptionRequest;

async function handle(data: RequestData): Promise<PlayResponse> {
    async function respond(response?: string | PlayResponse) {
        if (!response) {
            response = await getSceneResponse(session);
        }
        if (typeof response == "string") {
            response = {
                type: "error",
                message: response,
            }
        }
        return response;
    }
    if (data.action == "newSession") {
        const session = new Session();
        await session.ready;
        return respond({
            type: "newSession",
            id: session.id,
            scene: await getSceneResponse(session),
        });
    }
    const session = Session.sessions[data.session];
    
    const newItems: Record<ID, ID> = {};
    async function createItems(items: Items) {
        if (data.action != "newOption") {
            return;
        }
        for (const [id, count] of Object.entries(items)) {
            const itemId = id as ID;

            if (itemId in data.newItems && !newItems[itemId]) {
                const newItem = data.newItems[itemId];
                newItems[itemId] = await createItem(
                    newItem.name,
                    newItem.description,
                );
            }

            if (newItems[itemId]) {
                items[newItems[itemId]] = count;
                delete items[itemId];
            }
        }
    }
    if (!session) {
        return await respond("Sesion not found");
    }
    switch (data.action) {
        case "chooseOption":
            await session.choose(data.option);
            return respond();
        case "getScene":
            return respond();
        case "newOption": {
            const option = data.option;
            const requiredItems: Items = option.requiredItems;
            await createItems(requiredItems);
            const newScenes: Record<ID, ID> = {};
            const newOption: Option = {
                value: option.value,
                requiredItems: option.requiredItems,
                link: await Promise.all(option.link.map(async link => {
                    const value = link.value;
                    if (value in data.newScenes) {
                        if (!(value in newScenes)) {
                            const newScene = data.newScenes[value];
                            await createItems(newScene.items);
                            newScenes[value] = await createScene(newScene.value, newScene.items);
                        }
                        link.value = newScenes[value];
                    }
                    return link;
                }))
            }
            await session.createOption(newOption);
            return respond();
        }
        default:
            return respond("Invalid action");
    }
}

export const handler = async (req: Request) => {
    const data = await req.json();
    const promises: Promise<PlayResponse>[] = [];
    const result: PlayResponse[] = [];
    for (const item of data.requests) {
        const promise = handle(item);
        if (data.parallel) {
            promises.push(promise);
        } else {
            result.push(await promise);
        }
    }
    for (const promise of promises) {
        result.push(await promise);
    }
    return Response.json(result);
}