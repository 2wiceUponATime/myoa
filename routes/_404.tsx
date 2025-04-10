import { Head } from "$fresh/runtime.ts";

export default function Error404() {
    return (
        <>
            <Head>
                <title>404 - Page not found</title>
            </Head>
            <h1>404</h1>
            <p>Sorry, but the page you requested could not be found.</p>
        </>
    );
}
