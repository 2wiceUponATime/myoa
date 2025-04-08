
import { PlayResponse, SceneResponse } from "@/routes/api/play.ts";
import { useEffect } from "preact/hooks";

class Client {
    id: string = "";
    scene?: SceneResponse;
    ready: Promise<void>
    
    constructor() {
        this.ready = this.send({ action: "startSession" }).then((response) => {
            if (response.type !== "start") { throw new Error(); }
            this.id = response.id;
            this.scene = response.scene;
        });
    }

    async send(data: { id?: string; [key: string]: unknown }): Promise<PlayResponse> {
        if (this.id) {
            data.id = this.id;
        }
        const response = await fetch("/api/play", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (response.ok) {
            const json: PlayResponse = await response.json();
            if (json.type == "scene") {
                this.scene = json;
            }
            return json;
        } else {
            throw new Error(`Network error ${response.status}`);
        }
    }
}

export default function Scene() {
    useEffect(() => {
        function id(id: string): HTMLElement {
            const result = document.getElementById(id);
            if (!result) {
                throw new Error();
            }
            return result;
        }
        const value = id("value");
        const items = id("items");
        const itemsLabel = id("items-label");
        const createOption = id("create-option");
        const options = Array(4)
            .fill(0)
            .map((_, index) => id("option" + (index + 1)));
        createOption.addEventListener("click", async () => {
            if (options[3].innerText) {
                return;
            }
            const option = prompt("Enter option text:");
            if (!option) {
                return;
            }
            const scene = prompt("Enter new scene text:")
            if (!scene) {
                return;
            }
            await client.send({
                action: "createOption",
                option,
                scene,
            })
        })
        const client = new Client();
        function updateScene() {
            const scene = client.scene;
            console.log(scene);
            if (!scene) {
                throw new Error();
            }
            value.innerText = scene.value || "";
            for (const [index, option] of options.entries()) {
                const sceneOption = scene.options[index];
                if (!sceneOption) {
                    option.innerText = "";
                    continue
                }
                option.setAttribute("data-locked", sceneOption.locked.toString());
                option.innerText = sceneOption.value;
            }
            if (scene.options.length < 4) {
                createOption.style.display = "block";
            }
            const itemEntries = Object.entries(scene.items);
            itemsLabel.style.display = itemEntries.length ? "block" : "none"
            console.log(items.style.display);
            if (itemEntries.length) {
                items.replaceChildren(...Object.entries(scene.items).map(
                    ([id, item]) => {
                        const li = document.createElement("li");
                        li.setAttribute("data-id", id);
                        li.textContent = item.name
                            + (item.count > 1 ? ` (${item.count})` : '')
                            + (item.description ? " - " + item.description : "");
                        return li;
                    }
                ));
            }
        }
        client.ready.then(() => {
            updateScene();
            for (const [index, option] of options.entries()) {
                option.addEventListener("click", async () => {
                    if (
                        !option.innerText ||
                        JSON.parse(option.getAttribute("data-locked") || "false")
                    ) {
                        return;
                    }
                    createOption.style.display = "none";
                    await client.send({
                        "action": "choose",
                        "option": index,
                    });
                    updateScene();
                });
            }
        })
    })

    return (
        <div>
            <p id="value"></p>
            <p class="option" id="option1"></p>
            <p class="option" id="option2"></p>
            <p class="option" id="option3"></p>
            <p class="option" id="option4"></p>
            <p class="option" id="create-option" style="display: none;">Create an option</p>
            <strong id="items-label">Items:</strong>
            <ul id="items"></ul>
        </div>
    );
}