import Scene from "@/islands/Scene.tsx";

export default function Home() {
    return (
        <>
            <p>
                Make Your Own Adventure (MYOA) is a choose-your-own-adventure
                game that you make.&nbsp;
                <a href="https://github.com/2wiceUponATime/myoa">
                    View on GitHub
                </a> <br/>
                Feel free to share this page with others. The more adventurers, the merrier!
            </p>
            <p>
                <strong>Note:</strong> This project is currently in alpha and
                you may encounter silent failures or other bugs.
            </p>
            <hr/>
            <Scene />
        </>
    );
}
