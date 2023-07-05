import shortid from "shortid";
import { City } from "./City";

export const Road = (from: City, to: City) => ({ id: shortid.generate(), from, to });
export type Road = ReturnType<typeof Road>;
