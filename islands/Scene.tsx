import { PlayResponse, RequestData, SceneResponse } from "@/routes/api/play.ts";
import OptionLink from "@/components/OptionLink.tsx"
import { useEffect } from "preact/hooks";
import { ID, ItemMap } from "@/lib/db.ts";
import Popup from "@/components/Popup.tsx";
import { getId, getItemText } from "../lib/helpers.tsx";
import NewOption from "@/islands/NewOption.tsx";
import { signal } from "@preact/signals";

const OPTION_NUM = 4;

type PlayRequestData = {
    action: "newSession";
} | (Omit<RequestData, "session"> & { session?: ID })
  | RequestData;

type PlayRequest = {
    parallel: boolean;
    requests: PlayRequestData[];
}

export class Client {
    session?: ID;
    scene?: SceneResponse;
    scenes: Record<ID, string> = JSON.parse(localStorage.scenes || "{}");
    items: ItemMap = JSON.parse(localStorage.items || "{}");
    ready: Promise<void>;
    
    constructor() {
        this.ready = this.send({ action: "newSession" }).then(([response]) => {
            if (response.type !== "newSession") { throw new Error(); }
            this.session = response.id;
            this.#setScene(response.scene);
        });
    }

    #setScene(scene: SceneResponse) {
        this.scene = scene;
        this.scenes[scene.id] = scene.value;
        for (const [index, item] of Object.entries(scene.itemMap)) {
            const id = index as ID;
            this.items[id] = item;
        }
        this.save();
    }

    save() {
        localStorage.scenes = JSON.stringify(this.scenes);
        localStorage.items = JSON.stringify(this.items);
    }

    async send(
        data: PlayRequestData | PlayRequestData[],
        parallel = false
    ): Promise<PlayResponse[]> {
        if (!(data instanceof Array)) {
            data = [data];
        }
        if (this.session) {
            for (const request of data) {
                if (request.action == "newSession") continue;
                request.session = this.session;
            }
        }
        const request: PlayRequest = {
            parallel,
            requests: data,
        }
        const response = await fetch("/api/play", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
        if (response.ok) {
            const json: PlayResponse[] = await response.json();
            for (const result of json) {
                if (result.type == "getScene") {
                    this.#setScene(result);
                } else if (result.type == "error") {
                    alert(result.message);
                    console.error(result.message);
                }
            }
            return json;
        } else {
            const error = `Network error ${response.status}`;
            alert(error);
            throw new Error(error);
        }
    }
}

export let client: Client;

function range(length: number): number[] {
    return Array(length).fill(0).map((_, index) => index);
}

function startClient() {
    function visible(option: HTMLElement | number, visible: boolean) {
        if (typeof option == "number") {
            option = options[option];
        }
        const parent = option.parentElement;
        if (!parent) {
            throw new Error("Option has no parent");
        }
        if (visible) {
            parent.classList.remove("hidden");
        } else {
            parent.classList.add("hidden");
        }
    }
    function isVisible(option: HTMLElement | number) {
        if (typeof option == "number") {
            option = options[option];
        }
        if (!option.parentElement) {
            throw new Error("Option has no parent");
        }
        return !option.parentElement.classList.contains("hidden");
    }
    function locked(option: HTMLElement | number, locked: boolean) {
        if (typeof option == "number") {
            option = options[option];
        }
        if (locked) {
            option.setAttribute("data-locked", "");
        } else {
            option.removeAttribute("data-locked");
        }
    }
    function isLocked(option: HTMLElement | number) {
        if (typeof option == "number") {
            option = options[option];
        }
        return option.hasAttribute("data-locked") || !isVisible(option);
    }
    async function updateScene() {
        await client.ready;
        const scene = client.scene!;
        sceneText.innerText = scene.value;
        if (scene.options.length >= OPTION_NUM) {
            newOption.classList.add("hidden");
        } else {
            newOption.classList.remove("hidden");
        }
        for (const [index, option] of options.entries()) {
            const sceneOption = scene.options[index];
            if (!sceneOption) {
                visible(option, false);
                continue;
            }
            visible(option, true);
            locked(index, sceneOption.locked);
            option.innerText = sceneOption.value;
        }
        items.replaceChildren(...Object.entries(scene.items).map(([id, count]) => {
            const item = scene.itemMap[id as ID];
            const li = document.createElement("li");
            li.innerText = getItemText(item, count);
            if (item.description) {
                li.title = item.description;
            }
            return li;
        }))
    }

    const sceneText = getId("scene-text");
    const items = getId("items");
    const newOption = getId("new-option");
    const newOptionPopup = getId("new-option-popup");
    const options = range(OPTION_NUM).map(num => getId("option" + num));
    let loading = true;
    for (const [index, option] of options.entries()) {
        visible(option, false);
        option.addEventListener("click", async () => {
            if (loading || isLocked(option)) return;
            loading = true;
            await client.send({
                action: "chooseOption",
                session: client.session!,
                option: index
            });
            await updateScene();
            loading = false;
        });
    }
    newOption.addEventListener("click", () => {
        newOptionPopup.classList.remove("hidden");
    });
    loading = false;
    client = new Client();
    updateScene();
}

export default function Scene() {
    useEffect(startClient);
    return (
        <div>
            <p id="scene-text"></p>
            <div>Options:</div>
            <ul>
                {...range(OPTION_NUM).map(i => (
                    <OptionLink num={i} />
                ))}
            </ul>
            <p>
                <span class="link" id="new-option">New option</span>
            </p>
            <div>Items:</div>
            <ul id="items" />
            <Popup id="new-option-popup">
                <NewOption state={signal({
                    newItems: {},
                    newScenes: {},
                    option: {
                        value: "New option",
                        requiredItems: {},
                        link: [],
                    }
                })}/>
            </Popup>
        </div>
    )
}