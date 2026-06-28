import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getTursoConfig } from "./env";
import * as schema from "./schema";

const { url, authToken } = getTursoConfig();

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { client as libsqlClient };

export { schema };
