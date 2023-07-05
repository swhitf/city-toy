import { Point } from "../geom/Point";
import { Rect } from "../geom/Rect";
import { City } from "./City";
import { Road } from "./Road";

export const Model = (cities: City[], roads: Road[]) => ({ cities, roads });
export type Model = ReturnType<typeof Model>;

export const randomModel = () => {

    const bounds = new Rect(-1000, -1000, 2000, 2000);

    const cities = computeCities(bounds, 36);
    const roads = computeRoads(cities);

    return Model(cities, roads);
}

export const computeCities = (bounds: Rect, count: number) => {

    const cities = [] as City[];

    for (let i = 0; i < count; i++) {

        for (let j = 0; j < 10000; j++) {
            const x = (Math.random() * bounds.width) + bounds.left;
            const y = (Math.random() * bounds.height) + bounds.top;
            console.log(x, y);
            const pt = new Point(x, y);
            if (bounds.contains(pt) && !cities.some(x => pt.distanceTo(x.position) < 300)) {
                cities.push(City(pt));
                break;
            }
        }
    }

    return cities;
}

export const computeRoads = (cities: City[]) => {

    const roads = [] as Road[];

    for (const c of cities) {

        const others = cities.filter(x => x !== c);
        const nearToFar = others.sort((a, b) => c.position.distanceTo(a.position) - c.position.distanceTo(b.position));

        const n1 = Road(c, nearToFar[0]);
        if (!roads.some(x => x.from === n1.from && x.to === n1.to)) {
            roads.push(n1);
        }

        const n2 = Road(c, nearToFar[1]);
        if (!roads.some(x => x.from === n2.from && x.to === n2.to)) {
            roads.push(n2);
        }
    }

    return roads;
};

export const addCity = (model: Model, at: Point) => {

    const next = City(at);
    const cities = [...model.cities, next];
    const roads = [...model.roads];

    const others = cities.filter(x => x !== next);
    const nearToFar = others.sort((a, b) => next.position.distanceTo(a.position) - next.position.distanceTo(b.position));

    const n1 = Road(next, nearToFar[0]);
    if (!roads.some(x => x.from === n1.from && x.to === n1.to)) {
        roads.push(n1);
    }

    const n2 = Road(next, nearToFar[1]);
    if (!roads.some(x => x.from === n2.from && x.to === n2.to)) {
        roads.push(n2);
    }

    return Model(cities, roads);
};