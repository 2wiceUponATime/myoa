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

class PlayError extends Error {
    override name: string = "PlayError";
}

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
        throw new PlayError("Session not found - try reloading the page");
    }
    switch (data.action) {
        case "chooseOption":
            await session.choose(data.option);
            return respond();
        case "getScene":
            return respond();
        case "newOption": {
            const option = data.option;
            if (!option.value) {
                throw new PlayError("Option name is required");
            }
            if (option.value.length > 50) {
                throw new PlayError("Option name cannot be more than 50 characters");
            }
            if (!option.link.length) {
                throw new PlayError("Link is required");
            }
            for (const item of Object.values(data.newItems)) {
                if (!item.name) {
                    throw new PlayError("Item name is required");
                }
                if (item.name.length > 50) {
                    throw new PlayError("Item name cannot be more than 50 characters");
                }
                if ((item.description?.length || 0) > 100) {
                    throw new PlayError("Item description cannot be more than 100 characters");
                }
            }
            for (const scene of Object.values(data.newScenes)) {
                if (!scene.value) {
                    throw new PlayError("Scene description is required");
                }
                if (scene.value.length > 500) {
                    throw new PlayError("Scene cannot be more than 500 characters");
                }
            }
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
            throw new PlayError("Invalid action");
    }
}

export const handler = async (req: Request) => {
    async function getResponse(request: RequestData): Promise<PlayResponse> {
        try {
            return await handle(request);
        } catch (err) {
            if (!(err instanceof PlayError)) {
                throw err;
            }
            return {
                type: "error",
                message: err.message,
            };
        }
    }
    const data = await req.json();
    const promises: Promise<PlayResponse>[] = [];
    const result: PlayResponse[] = [];
    for (const item of data.requests) {
        const promise = getResponse(item);
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