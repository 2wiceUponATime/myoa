/// <reference lib="deno.unstable" />

export const kv = await Deno.openKv();

export const start = "bb179099-b85c-4558-8cb9-d658b0d42cce";

if (!(await getScene(start))) {
    createScene(
        "Welcome to Make Your Own Adventure, where the adventure is built by you!",
        {},
        start,
    )
}

export type ID = `${string}-${string}-${string}-${string}-${string}`;

export type Items = Record<ID, number>;

export type Scene = {
    id: ID;
    value: string;
    items: Items;
    options: Option[];
}

export type Option = {
    value: string;
    requiredItems: Items;
    link: Link[];
}

export type Link = {
    weight: number;
    value: ID;
}

export type Item = {
    id: ID,
    name: string,
    description?: string,
}

export type ItemMap = Record<ID, Item>;

export type SceneMap = Record<ID, Scene>;

export async function getScene(id: string): Promise<Scene> {
    return (await kv.get(["scenes", id])).value as Scene;
}

export async function setScene(id: ID, value: Scene) {
    await kv.set(["scenes", id], value);
}

export async function createScene(
    value: string,
    items: Items = {},
    id: ID = crypto.randomUUID()
) {
    await setScene(id, {
        id,
        value,
        items,
        options: [],
    });
    return id;
}

export async function  getItem(id: ID): Promise<Item> {
    return (await kv.get(["items", id])).value as Item;
}

function toObject<
    K extends string | number | symbol,
    V
>(keys: K[], values: V[]): Record<K, V> {
    return Object.fromEntries(keys.map(
        (value, index) => [value, values[index]]
    )) as unknown as Record<K, V>;
}

export async function getItems(ids: ID[]) {
    const results = (await kv.getMany(ids.map(id => ["items", id])))
        .values()
        .toArray() as unknown as Item[];
    return toObject(ids, results);
}

export async function setItem(id: ID, value: Item) {
    await kv.set(["items", id], value);
}

export async function createItem(name: string, description?: string) {
    const id: ID = crypto.randomUUID();
    await setItem(id, {
        id,
        name,
        description,
    });
    return id;
}

export async function createOption(id: ID, option: Option) {
    const scene = await getScene(id);
    scene.options.push(option);
    await setScene(id, scene);
    return scene;
}
