
import { App } from "@/app/api/[[...slugs]]/route";
import { treaty } from "@elysiajs/eden";

export const client = treaty<App>(typeof window === "undefined"
        ? "http://localhost:3000"
        : window.location.origin
).api;
