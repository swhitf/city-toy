import { ShapeInfo } from 'kld-intersections';
import { Geometry, IntersectResult } from './Geometry';
import { Line } from './Line';
import { Matrix } from './Matrix';
import { Path, PathCommand } from './Path';
import { HasPoints, Point } from './Point';
import { Rect } from './Rect';

export class Polyline implements Iterable<Point> {

    public static from(points: HasPoints, close?: boolean): Polyline {
        const mpts = Point.manyFrom(points);
        if (close && mpts.length > 1 && !mpts[0].equals(mpts[mpts.length - 1])) {
            mpts.push(mpts[0]);
        }
        return new Polyline(mpts);
    }

    public readonly points: readonly Point[];

    constructor(points: readonly Point[]) {
        if (points.length < 1) throw new Error('Path must have more than one point.');
        // We do this because the kld library can mutate arrays and we want to really be sure points can't change.
        Object.defineProperty(this, 'points', {
            configurable: false,
            enumerable: true,
            writable: false,
            value: Object.freeze(points.slice(0)),
        });
    }

    public get bounds(): Rect {
        return Rect.fromPoints(this.points);
    }

    public get center(): Point {
        if (this.points.length === 0) return Point.zero;
        return this.points.reduce((t, x) => t.add(x)).divide(this.points.length);
    }

    public get left(): Point {
        return this.furthestPoint((a, b) => a.x - b.x);
    }

    public get right(): Point {
        return this.furthestPoint((a, b) => b.x - a.x);
    }

    public get top(): Point {
        return this.furthestPoint((a, b) => a.y - b.y);
    }

    public get bottom(): Point {
        return this.furthestPoint((a, b) => b.y - a.y);
    }

    public get closed(): boolean {
        return this.points[0].equals(this.points[this.points.length - 1]);
    }

    public get lines(): readonly Line[] {
        const lines = [] as Line[];
        for (let i = 1; i < this.points.length; i++) {
            const a = this.points[i - 1];
            const b = this.points[i];
            if (a.equals(b)) continue;
            lines.push(new Line(a, b));
        }
        return lines;
    }

    public get length(): number {
        return this.lines.map(x => x.length).reduce((t, x) => t + x, 0);
    }

    // public walk(t: number) {
    //     t = Math.max(0, Math.min(1, t));
    //     const stop = this.length / t;
    //     let acc = 0;
    //     for (const ln of this.lines) {
    //         if ((acc + ln.length) > stop) {
    //             return ln.walk((stop - acc) / ln.length);
    //         }
    //         else {
    //             acc += ln.length;
    //         }
    //     }
    //     return [this.lines[0].p1, Point.zero];
    // }

    public distanceTo(pt: Point): number {
        const dists = this.lines.map(x => x.distanceTo(pt));
        return Math.min(...dists);
    }

    public nearestPointTo(pt: Point): Point {
        return this.lines.map(x => x.nearestPointTo(pt))
            .reduce((a, b) => a.distanceTo(pt) < b.distanceTo(pt) ? a : b);
    }

    public inflate(amount: number) {
        return new Polyline(this.points.map(p => {
            const v = p.subtract(this.center).normalize();
            return p.add(v.multiply(amount));
        }));
    }

    /**
     * Applies the specified Matrix to the data of this Polyline and returns a new Polyline with the transformation result.
     *
     * @param mt the matrix.
     */
    public transform(mt: Matrix): Polyline {
        return new Polyline(mt.apply(this.points));
    }

    public contains(input: Point | HasPoints): boolean {
        const points = Point.manyFrom(input);
        // Every point must be inside the chain to test true.
        for (const pt of points) {
            // Optimize by quickly checking the point is in the bounds first.
            if (!this.bounds.contains(pt)) {
                return false;
            }
            // Use the ray cast technique; create a ray and intesect with lines and if the intersection number is odd then the point must be
            // inside.  We consider any points that are 0.00001 close to the line to be on the line and thus inside so check for this first.
            const ray = new Line(new Point(Point.max.x, pt.y), pt);
            let count = 0;
            for (const ln of this.lines) {
                if (ln.distanceTo(pt) < 0.00001) {
                    // Set count to 1 to force pass and break.
                    count = 1;
                    break;
                }
                if (ray.intersects(ln)) {
                    count++;
                }
            }
            // Even then we are not inside.
            if (count % 2 === 0) {
                return false;
            }
        }
        return true;
    }

    public intersects(another: Geometry): boolean {
        return !!this.intersectPoints(another);
    }

    public intersectPoints(another: Geometry): IntersectResult {
        return Geometry.intersect(this, another);
    }

    public toPath(close = true) {
        const cmds = this.points.map((pt, i) => i === 0 ? ['M', pt] : ['L', pt]) as PathCommand[];
        if (close) {
            cmds.push(['Z']);
        }
        return new Path(cmds);
    }

    public toRoundedPath(method: 'quadratic' | 'cubic', factor: number | number[], close = true) {
        if (Array.isArray(factor) && !factor.length) return this.toPath(close);
        if (!factor || (!Array.isArray(factor) && factor < 0)) return this.toPath(close);

        const fx = Array.isArray(factor)
            ? (i: number) => factor[i] ?? 0
            : (_i: number) => factor as number;

        // Magic number that allows us to closely appromixate an arc with cubic bezier
        const kappa = 0.5522847498307933984022516322796;

        const cmds = [] as PathCommand[];
        const lines = this.lines.filter(x => x.length !== 0);

        for (let i = 0; i < lines.length; i++) {
            const a = lines[i % lines.length];
            const b = lines[(i + 1) % lines.length];

            const l = Math.min(a.length / 2, b.length / 2, fx(i));

            const p1 = a.p1;
            const p2 = a.p2;
            const p3 = b.p2;

            const sp = p2.add(Point.vector(p2, p1).normalize().multiply(l));
            const ep = p2.add(Point.vector(p2, p3).normalize().multiply(l));

            cmds.push([i === 0 ? 'M' : 'L', sp]);

            if (method === 'quadratic') {
                cmds.push(['Q', p2, ep]);
            }
            else {
                const cp1 = sp.add(Point.vector(sp, p2).normalize().multiply(l * kappa));
                const cp2 = ep.add(Point.vector(ep, p2).normalize().multiply(l * kappa));
                cmds.push(['C', cp1, cp2, ep]);
            }
        }

        if (close) {
            cmds.push(['Z']);
        }

        return new Path(cmds);
    }

    public toShapeInfo() {
        return ShapeInfo.polyline(this.points.slice(0));
    }

    public [Symbol.iterator](): Iterator<Point> {
        return this.points[Symbol.iterator]();
    }

    private furthestPoint(comparer: (a: Point, b: Point) => number): Point {
        return this.points.slice(0).sort(comparer)[0];
    }
}
