import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount @convex-dev/auth HTTP routes (sign-in, sign-out, session refresh)
auth.addHttpRoutes(http);

export default http;
