import { Point2D } from 'kld-affine';
import { Intersection } from 'kld-intersections';
import { Point } from './Point';

export interface Geometry {

    intersects(another: Geometry): boolean;

    intersectPoints(another: Geometry): IntersectResult;

    toShapeInfo(): any;
}

export type IntersectResult = Point[] | false;

export const Geometry = Object.freeze({

    intersect(a: Geometry, b: Geometry): IntersectResult {
        const result = Intersection.intersect(a.toShapeInfo(), b.toShapeInfo());
        if (result.status === 'Intersection') {
            return transformPoints(result.points);
        }
        return false;
    },

});

const transformPoints = (p2d: Point2D[]) => {
    const t = new Set<string>();
    const r = [] as Point[];

    for (const x of p2d) {
        const k = x.toString();
        if (t.has(k)) continue;
        t.add(k);
        r.push(Point.from(x));
    }

    return r;
};

