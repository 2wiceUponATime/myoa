import Header from "@/components/Header.tsx";
import Scene from "@/islands/Scene.tsx";

export default function Home() {
    return (
        <div id="main" class="background">
            <Header />
            <div class="content">
                <div class="panel">
                    <p>
                        Make Your Own Adventure (MYOA) is a
                        choose-your-own-adventure game that you make.
                    </p>
                    <p>
                        Feel free to share this page with others. The more
                        adventurers, the merrier!
                    </p>
                    <hr />
                    <Scene />
                </div>
            </div>
        </div>
    );
}