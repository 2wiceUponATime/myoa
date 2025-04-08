import { createClient } from "jsr:@supabase/supabase-js@2";

export type Scene = {
    id: number;
    created_at: string;
    value: string;
    options: Option[];
    items: Item[];
}

export type Option = {
    id: number;
    created_at: string;
    value: string;
    required_item?: Item;
    link: number;
}

export type Item = {
    id: number;
    created_at: string;
    name: string;
    description?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

async function getSceneRaw(id: number): Promise<{
    id: number;
    created_at: string;
    value: string;
    options: number[];
    items: number[];
}> {
    const result = await supabase
        .from("scenes")
        .select("*")
        .eq("id", id)
        .single();
    if (result.error) {
        console.error("Error getting scene");
        throw result.error;
    }
    return result.data
}

export async function getScene(id: number): Promise<Scene> {
    const scene = await getSceneRaw(id);
    const newScene: Scene = {
        id: scene.id,
        created_at: scene.created_at,
        value: scene.value,
        options: [],
        items: [],
    };
    scene.options ||= [];
    const promises = [];
    for (const [index, id] of scene.options.entries()) {
        promises.push(supabase
            .from("options")
            .select("*")
            .eq("id", id)
            .single()
            .then(async result => {        
                if (result.error) {
                    throw result.error;
                }
                const option = result.data;
                if (option.required_item) {
                    option.required_item = await getItem(option.required_item);
                } else {
                    delete option.required_item;
                }
                if (!option.description) {
                    delete option.description;
                }
                newScene.options[index] = result.data;
            })
        )
    }
    scene.items ||= [];
    for (const [index, id] of scene.items.entries()) {
        promises.push(getItem(id).then(item => {
            newScene.items[index] = item;
        }))
    }
    for (const promise of promises) {
        await promise;
    }
    return newScene;
}

export async function getItem(id: number): Promise<Item> {
    const result = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
    if (result.error) {
        throw result.error;
    }
    return result.data;
}

export async function createOption(
    id: number,
    option: string,
    scene: string,
    required_item?: number,
) {
    const sceneResult = await supabase
        .from("scenes")
        .insert({
            value: scene,
        })
        .select();
    if (sceneResult.error) {
        console.error("Error creating scene");
        throw sceneResult.error;
    }
    const newSceneRow = sceneResult.data[0];
    const optionResult = await supabase
        .from("options")
        .insert({
            value: option,
            link: newSceneRow.id,
            required_item,
        })
        .select();
    if (optionResult.error) {
        console.error("Error creating option");
        throw optionResult.error;
    }
    const optionRow = optionResult.data[0];
    const sceneRow = await getSceneRaw(id);
    const updateResult = await supabase
        .from("scenes")
        .update({
            options: (sceneRow.options || []).concat([optionRow.id]),
        })
        .eq("id", id);
    if (updateResult.error) {
        console.error("Error updating row");
        throw updateResult.error;
    }
}