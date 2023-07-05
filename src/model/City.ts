import shortid from "shortid";
import { Point } from "../geom/Point";


const types = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const randomType = () => types[Math.floor(Math.random() * types.length)];

export const City = (position: Point) => ({ id: shortid.generate(), type: randomType(), position });
export type City = ReturnType<typeof City>;