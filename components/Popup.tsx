import { Button, getId } from "../lib/helpers.tsx";

export default function Popup(props: {
    children?: unknown;
    id?: string;
}) {
    const id = props.id || crypto.randomUUID();
    function onClick() {
        const popup = getId(id);
        popup.classList.add("hidden");
        const event = new Event("close");
        popup.dispatchEvent(event);
    }
    let children = [];
    if (props.children) {
        children = props.children instanceof Array
            ? props.children
            : [props.children];
    }
    return (
        <div class="popup-background hidden" id={id}>
            <div class="popup">
                <p>
                    <Button onClick={onClick}>&times;</Button>
                </p>
                {...children}
            </div>
        </div>
    );
}