import { signal, Signal } from "@preact/signals";
import { ID, Item, ItemMap, Option, Scene, SceneMap } from "@/lib/db.ts";
import { useEffect } from "preact/hooks";
import { Button, getItemText } from "../lib/helpers.tsx";
import { client, debug } from "@/islands/Scene.tsx";

type NewOptionState = {
    newItems: ItemMap;
    newScenes: SceneMap;
    option: Option;
}

type State = Signal<NewOptionState>;

function getScenes(state: State) {
    const result: Record<ID, string> = JSON.parse(localStorage.scenes);
    for (const [index, scene] of Object.entries(state.value.newScenes)) {
        result[index as ID] = scene.value
    }
    return result;
}

function NewItem(props: {
    item: Item,
    state: State,
}) {
    function update() {
        state.value = {
            ...state.value,
            newItems: {
                ...state.value.newItems,
                [item.id]: {
                    id: item.id,
                    name: name.value,
                    description: description.value || undefined,
                }
            }
        }
    }
    const state = props.state;
    const item = props.item;
    let name: HTMLInputElement;
    let description: HTMLInputElement;
    return (
        <div>
            <Button
                onClick={() => {
                    const newItems = state.value.newItems;
                    delete newItems[item.id];
                    state.value = {
                        ...state.value,
                        newItems,
                    };
                }}
            >
                &times;
            </Button>
            <input
                value={item.name}
                ref={(el) => { if (el) { name = el; } }}
                onInput={update}
                placeholder="Name"
            />
            <input
                value={item.description || ""}
                ref={(el) => { if (el) { description = el; } }}
                onInput={update}
                placeholder="Description"
            />
        </div>
    );
}

function SelectItem(props: {
    state: State;
    onChange?: (oldId: ID | undefined, newId: ID, count: number) => unknown;
    value?: ID;
    count?: number;
    includeNew?: boolean;
}) {
    const onChange = (isCount = false) => {
        if (select.value == value && !isCount) return;
        const newCount = count.valueAsNumber;
        if (props.onChange) {
            props.onChange(value, select.value as ID, newCount);
        }
    }
    const state = props.state;
    let value = props.value;
    const includeNew = props.includeNew || true;
    useEffect(() => {
        const items: ItemMap = JSON.parse(localStorage.items);
        if (includeNew) {
            Object.assign(items, state.value.newItems);
        }
        select.replaceChildren(...Object.values(items).map(item => {
            value ||= item.id;
            const option = document.createElement("option");
            option.value = item.id;
            option.innerText = getItemText(item);
            if (debug) {
                option.innerText += ` (${item.id})`;
            }
            return option;
        }));
        if (value) select.value = value;
        value = select.value as ID;
        onChange();
    });
    const updateCount = props.onChange && (() => onChange(true));
    let select: HTMLSelectElement;
    let count: HTMLInputElement;
    return (
        <div>
            <select
                ref={(el) => { if (el) select = el; }}
                onInput={props.onChange ? () => onChange() : undefined}
            />
            <input
                ref={(el) => { if (el) count = el; }}
                type="number"
                value={props.count || 1}
                min="1"
                max="99"
                onBlur={updateCount}
                onKeyUp={updateCount && (event => {
                    if (event.key == "Enter") updateCount();
                })}
            />
        </div>
    )
}

function SelectScene(props: {
    state: State;
    onChange?: (newId: ID) => unknown;
    value?: ID;
}) {
    const onChange = () => {
        const newValue = select.value as ID;
        if (value == newValue) return;
        if (props.onChange) {
            props.onChange(newValue);
        }
    }
    const state = props.state;
    let value = props.value;
    useEffect(() => {
        const scenes = getScenes(state);
        delete scenes[client.scene!.id];
        select.replaceChildren(...Object.entries(scenes).map(([index, scene]) => {
            const id = index as ID;
            value ||= id;
            const option = document.createElement("option");
            option.value = id;
            option.innerText = scene;
            if (debug) {
                option.innerText += ` (${id})`;
            }
            return option;
        }));
        if (value) select.value = value;
        value = select.value as ID;
        onChange();
    });
    let select: HTMLSelectElement;
    return (
        <div>
            <select
                ref={(el) => { if (el) select = el; }}
                onInput={props.onChange ? () => onChange() : undefined}
            />
        </div>
    )
}

function OptionLinks(props: {
    state: State;
}) {
    function updateWeight(index: number, weight: number) {
        const links = state.value.option.link;
        links[index].weight = weight;
        state.value = {
            ...state.value,
            option: {
                ...state.value.option,
                link: links,
            }
        }
    }
    const state = props.state;
    return (
        <div>
            {...state.value.option.link.map((link, index) => (
                <div>
                    <Button
                        onClick={() => {
                            const link = state.value.option.link;
                            link.splice(index, 1);
                            state.value = {
                                ...state.value,
                                option: {
                                    ...state.value.option,
                                    link,
                                }
                            }
                        }}
                    > &times; </Button>
                    <SelectScene
                        state={state}
                        value={link.value}
                        onChange={(newId) => {
                            const links = state.value.option.link;
                            links[index].value = newId;
                            state.value = {
                                ...state.value,
                                option: {
                                    ...state.value.option,
                                    link: links,
                                }
                            }
                        }}
                    />
                    <span class="small">Weight:</span>&nbsp;
                    <input
                        type="number"
                        min="1"
                        value={link.weight}
                        onBlur={event => updateWeight(
                            index,
                            (event.currentTarget as HTMLInputElement).valueAsNumber
                        )}
                        onKeyDown={event => {
                            if (event.key == "Enter") updateWeight(
                                index,
                                (event.currentTarget as HTMLInputElement).valueAsNumber
                            )
                        }}
                    />
                </div>
            ))}
            <Button class="wide" onClick={() => {
                const scenes = getScenes(state);
                if (!scenes) return;
                let newValue: ID;
                for (const index in scenes) {
                    if (state.value.option.link.filter(
                        link => link.value != index,
                    )) {
                        newValue = index as ID;
                        continue;
                    }
                    break;
                }
                state.value = {
                    ...state.value,
                    option: {
                        ...state.value.option,
                        link: state.value.option.link.concat({
                            weight: 1,
                            value: newValue!,
                        })
                    }
                }
            }}> + </Button>
        </div>
    )
}

function NewScene(props: {
    scene: Scene;
    state: State;
}) {
    function update() {
        state.value = {
            ...state.value,
            newScenes: {
                ...state.value.newScenes,
                [scene.id]: {
                    ...scene,
                    id: scene.id,
                    value: description.value,
                }
            }
        }
    }
    function SceneItem(props: {
        value: ID;
        count: number;
    }) {
        return (
            <div>
                <Button onClick={() => {
                    const newScene = state.value.newScenes[scene.id];
                    delete newScene.items[props.value];
                    state.value = {
                        ...state.value,
                        newScenes: {
                            ...state.value.newScenes,
                            [scene.id]: newScene,
                        }
                    }
                }}>
                    &times;
                </Button>
                <SelectItem
                    state={state}
                    {...props}
                    onChange={(oldId, newId, count) => {
                        if (oldId) delete scene.items[oldId];
                        state.value = {
                            ...state.value,
                            newScenes: {
                                ...state.value.newScenes,
                                [scene.id]: {
                                    ...scene,
                                    items: {
                                        ...scene.items,
                                        [newId]: (scene.items[newId] || 0) + count,
                                    },
                                },
                            },
                        }
                    }}
                />
                </div>
        );
    }
    const state = props.state;
    const scene = props.scene;
    let description: HTMLInputElement;
    return (
        <div class="box">
            <Button
                onClick={() => {
                    const newScenes = state.value.newScenes;
                    delete newScenes[scene.id];
                    state.value = {
                        ...state.value,
                        newScenes,
                    };
                }}
            >
                &times;
            </Button>
            <input
                ref={(el) => { if (el) { description = el; } }}
                onInput={update}
                placeholder="Description"
            />
            <div><br/> Items:</div>
            <p>
                {...Object.entries(scene.items).map(([index, count]) => {
                    const id = index as ID;
                    return (
                        <SceneItem value={id} count={count} />
                    )
                })}
            </p>
            <Button class="wide" onClick={() => {
                const items: Record<ID, Item> = Object.assign(JSON.parse(localStorage.items), state.value.newItems);
                for (const index in items) {
                    if (index in scene.items) continue;
                    state.value = {
                        ...state.value,
                        newScenes: {
                            ...state.value.newScenes,
                            [scene.id]: {
                                ...scene,
                                items: {
                                    ...scene.items,
                                    [index as ID]: 1,
                                },
                            },
                        },
                    }
                    break;
                }
            }}> + </Button>
        </div>
    )
}

function RequiredItems(props: {
    state: State
}) {
    function RequiredItem(props: {
        value: ID;
        count: number;
    }) {
        return (
            <div>
                <Button onClick={() => {
                    const option = state.value.option;
                    delete option.requiredItems[props.value];
                    state.value = {
                        ...state.value,
                        option,
                    }
                }}>
                    &times;
                </Button>
                <SelectItem
                    state={state}
                    includeNew={false}
                    {...props}
                    onChange={(oldId, newId, count) => {
                        const option = state.value.option;
                        if (oldId) delete option.requiredItems[oldId];
                        state.value = {
                            ...state.value,
                            option: {
                                ...option,
                                requiredItems: {
                                    ...option.requiredItems,
                                    [newId]: (option.requiredItems[newId] || 0) + count,
                                }
                            }
                        }
                    }}
                />
            </div>
        );
    }
    const state = props.state;
    return (
        <div>
            <p>
                {...Object.entries(state.value.option.requiredItems).map(([index, count]) => {
                    const id = index as ID;
                    return (
                        <RequiredItem value={id} count={count} />
                    )
                })}
            </p>
            <Button class="wide" onClick={() => {
                const items: Record<ID, Item> = JSON.parse(localStorage.items);
                for (const index in items) {
                    if (index in state.value.option.requiredItems) continue;
                    state.value = {
                        ...state.value,
                        option: {
                            ...state.value.option,
                            requiredItems: {
                                ...state.value.option.requiredItems,
                                [index as ID]: 1
                            }
                        }
                    }
                    break;
                }
            }}> + </Button>
        </div>
    );
}

export default function NewOption(props: {
    state?: State,
}) {
    const state = props.state ||= signal({
        newItems: {},
        newScenes: {},
        option: {
            value: "New option",
            requiredItems: {},
            link: [],
        }
    });

    return (
        <div>
            Option name:&nbsp;
            <input
                value={state.value.option.value}
                onInput={(e) => {
                    state.value = {
                        ...state.value,
                        option: {
                            ...state.value.option,
                            value: (e.target as HTMLInputElement).value,
                        },
                    };
                }}
            />
            <div><br/>New Items:</div>
            <p>
                {...Object.values(state.value.newItems).map(item => {
                    return (
                        <NewItem state={state} item={item} />
                    )
                })}
            </p>
            <Button class="wide" onClick={() => {
                const newId = crypto.randomUUID();
                state.value = {
                    ...state.value,
                    newItems: {
                        ...state.value.newItems,
                        [newId]: {
                            id: newId,
                            name: "New Item",
                        }
                    }
                }
            }}> + </Button>
            <div><br/>New Scenes:</div>
            <p>
                {...Object.values(state.value.newScenes).map(scene => {
                    return (
                        <NewScene state={state} scene={scene} />
                    )
                })}
            </p>
            <Button class="wide" onClick={() => {
                const newId = crypto.randomUUID();
                state.value = {
                    ...state.value,
                    newScenes: {
                        ...state.value.newScenes,
                        [newId]: {
                            id: newId,
                            value: "New Scene",
                            options: [],
                            items: {},
                        }
                    }
                }
            }}> + </Button>
            <div><br/>Required items:</div>
            <RequiredItems state={state} />
            <div><br/>Links:</div>
            <OptionLinks state={state} />
            <hr/>
            <Button class="wide" onClick={async () => {
                await client.ready;
                const [result] = await client.send({
                    action: "newOption",
                    ...state.value,
                });
                if (result.type != "error") {
                    location.reload();
                }
            }}>
                Create Option
            </Button>
        </div>
    );
}