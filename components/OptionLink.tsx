export default function OptionLink(props: {
    children?: unknown;
    num?: number;
}) {
    let children = [];
    if (props.children) {
        children = props.children instanceof Array
            ? props.children
            : [props.children];
    }
    const id = "num" in props ? "option" + props.num : undefined;
    return (
        <li>
            <span class="link" id={id}>
                {...children}
            </span>
        </li>
    )
}