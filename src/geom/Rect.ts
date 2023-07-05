import { ShapeInfo } from 'kld-intersections';
import { Geometry, IntersectResult } from './Geometry';
import { Line } from './Line';
import { round } from './Math';
import { Matrix } from './Matrix';
import { HasPoints, HasXY, Point, PointSource } from './Point';
import { Polyline } from './Polyline';


export interface RectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CssRect {
    left: string;
    top: string;
    width: string;
    height: string;
}

export type Rectuple = readonly [number, number, number, number];

export class Rect implements Geometry {

    public static empty: Rect = new Rect(0, 0, 0, 0);

    public static fromArray(ltwh: number[]): Rect {
        return new Rect(ltwh[0], ltwh[1], ltwh[2], ltwh[3]);
    }

    public static fromCenter(center: Point, radius: number | Point): Rect {
        radius = typeof (radius) === 'number' ? new Point(radius, radius) : radius;
        return Rect.fromPoints([center.add(radius), center.subtract(radius)]);
    }

    public static fromCircle(center: Point, diameter: number) {
        return this.fromPoints([center.add(diameter), center.subtract(diameter)]);
    }

    public static fromDims(position: Point, size: Point): Rect {
        return new Rect(position.x, position.y, size.w, size.h);
    }

    public static fromEdges(left: number, top: number, right: number, bottom: number): Rect {
        return new Rect(
            left,
            top,
            right - left,
            bottom - top
        );
    }

    public static fromElement(elmt: Element): Rect {
        return Rect.fromLike(elmt.getBoundingClientRect());
    }

    public static fromLike(like: RectLike): Rect {
        return new Rect(like.left, like.top, like.width, like.height);
    }

    public static fromMany(rects: readonly Rect[]): Rect {
        if (!rects.length) {
            return Rect.empty;
        }
        const pointSets = rects
            .filter(x => !x.width || x.height)
            .map(x => x.points());
        // eslint-disable-next-line prefer-spread
        const flatPoints = [].concat.apply([], pointSets as any);
        return Rect.fromPointBuffer(flatPoints);
    }

    public static fromPoints(points: readonly Point[]): Rect {
        return Rect.fromPointBuffer(points);
    }

    public static fromPointBuffer(points: readonly Point[], index?: number, length?: number): Rect {
        if (index !== undefined) {
            points = points.slice(index);
        }
        if (length !== undefined) {
            points = points.slice(0, length);
        }
        return Rect.fromEdges(
            Math.min(...points.map(p => p.x)),
            Math.min(...points.map(p => p.y)),
            Math.max(...points.map(p => p.x)),
            Math.max(...points.map(p => p.y))
        );
    }

    public static fromSize(size: PointSource, origin: 'topLeft' | 'center' = 'topLeft'): Rect {
        const pt = Point.from(size);
        return origin === 'topLeft'
            ? new Rect(0, 0, pt.w, pt.h)
            : new Rect(pt.w / -2, pt.h / -2, pt.w, pt.h);
    }

    public static parse(str: string) {
        const parts = str.split(/\,/g).map(x => parseFloat((x.match(/[\d\.]+/) ?? [])[0]));
        if (parts.length < 4) throw new Error(`${str} is not a valid rect.`);
        if (parts.find(x => isNaN(x))) throw new Error(`${str} is not a valid rect.`);
        const [l, t, w, h] = parts;
        return new Rect(l, t, w, h);
    }

    public readonly left: number = 0;
    public readonly top: number = 0;
    public readonly width: number = 0;
    public readonly height: number = 0;

    private shape?: ShapeInfo;

    constructor(left: number, top: number, width: number, height: number) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    public get right() {
        return this.left + this.width;
    }

    public get bottom() {
        return this.top + this.height;
    }

    public edge(name: 'left' | 'top' | 'right' | 'bottom') {
        return this[name];
    }

    public center(): Point {
        return new Point(this.left + (this.width / 2), this.top + (this.height / 2));
    }

    public topLeft(): Point {
        return new Point(this.left, this.top);
    }

    public topRight(): Point {
        return new Point(this.right, this.top);
    }

    public bottomLeft(): Point {
        return new Point(this.left, this.bottom);
    }

    public bottomRight(): Point {
        return new Point(this.right, this.bottom);
    }

    public area(): number {
        return this.width * this.height;
    }

    public clamp(rect: Rect) {
        return Rect.fromEdges(
            Math.max(this.left, rect.left),
            Math.max(this.top, rect.top),
            Math.min(this.right, rect.right),
            Math.min(this.bottom, rect.bottom),
        );
    }

    public project(pt: Point) {
        if (!this.contains(pt)) {
            const ray = new Line(pt, this.center());
            for (const ln of this.lines()) {
                const ip = ln.intersectPoint(ray);
                if (ip) return ln.project(pt);
            }
        }
        return pt;
    }

    public pointAt(xp, yp): Point {
        return new Point(
            this.left + (this.width * xp),
            this.top + (this.height * yp)
        );
    }

    public points(): Point[] {
        return [
            new Point(this.left, this.top),
            new Point(this.left + this.width, this.top),
            new Point(this.left + this.width, this.top + this.height),
            new Point(this.left, this.top + this.height),
        ];
    }

    public lines(): Line[] {
        const pts = this.points();
        return pts.map((_, i) => new Line(pts[i], pts[(i + 1) % pts.length]));
    }

    public size(): Point {
        return new Point(this.width, this.height);
    }

    public contains(input: HasXY | RectLike): boolean {
        if ('x' in input && 'y' in input) {
            return (
                input.x >= this.left
                && input.y >= this.top
                && input.x <= this.left + this.width
                && input.y <= this.top + this.height
            );
        }
        else {
            return (
                input.left >= this.left &&
                input.top >= this.top &&
                input.left + input.width <= this.left + this.width &&
                input.top + input.height <= this.top + this.height
            );
        }
    }

    public distanceTo(geom: HasPoints): number {
        // This algo probably sucks, but it works for now.
        const points = Point.manyFrom(geom);
        const gx = Rect.fromPoints(points).center();
        const tx = this.center();
        const [ta, tb] = this.points().sort((a, b) => a.distanceTo(gx) - b.distanceTo(gx));
        const [ga, gb] = this.points().sort((a, b) => a.distanceTo(gx) - b.distanceTo(gx));
        const t = new Line(ta, tb).nearestPointTo(gx);
        const g = new Line(ga, gb).nearestPointTo(tx);
        return t.distanceTo(g);
    }

    public intersects(geom: Geometry): boolean {
        if (geom instanceof Rect) {
            return !(
                geom.left > this.right ||
                geom.right < this.left ||
                geom.top > this.bottom ||
                geom.bottom < this.top
            );
        }
        else {
            return !!this.intersectPoints(geom);
        }
    }

    public intersectPoints(another: Geometry): IntersectResult {
        return Geometry.intersect(this, another);
    }

    public intersect(rect: RectLike): Rect {
        const s = (a: number, b: number) => a - b;
        const x = [rect.left, rect.left + rect.width, this.left, this.left + this.width].sort(s);
        const y = [rect.top, rect.top + rect.height, this.top, this.top + this.height].sort(s);
        return new Rect(
            x[1],
            y[1],
            x[2] - x[1],
            y[2] - y[1],
        );
    }

    public encapsulationVector(rect: Rect) {
        if (this.contains(rect)) return Point.zero;
        if (rect.width >= this.width) return Point.zero;
        if (rect.height >= this.height) return Point.zero;
        const a = this.center().farthestOf(rect.points());
        const bx = this.lines().map(x => x.nearestPointTo(a));
        const b = a.nearestOf(bx);
        return Point.vector(a, b);
    }

    public extend(size: PointSource): Rect {
        const pt = Point.from(size);
        return new Rect(
            this.left,
            this.top,
            this.width + pt.x,
            this.height + pt.y,
        );
    }

    public inflate(size: PointSource): Rect {
        const pt = Point.from(size);
        return Rect.fromEdges(
            this.left - pt.x,
            this.top - pt.y,
            this.right + pt.x,
            this.bottom + pt.y
        );
    }

    public offset(by: PointSource): Rect {
        const pt = Point.from(by);
        return new Rect(
            this.left + pt.x,
            this.top + pt.y,
            this.width,
            this.height
        );
    }

    public round(dp: number = 0): Rect {
        return Rect.fromEdges(
            round(this.left, dp),
            round(this.top, dp),
            round(this.right, dp),
            round(this.bottom, dp),
        );
    }

    /**
     * Applies the specified Matrix to the data of this Rect and returns the four new points of the rectangle as the transformation result.
     *
     * @param mt the matrix.
     */
    public transform(mt: Matrix): Point[] {
        return mt.apply(this.points());
    }

    public normalize(): Rect {
        if (this.width >= 0 && this.height >= 0) {
            return this;
        }
        let x = this.left;
        let y = this.top;
        let w = this.width;
        let h = this.height;
        if (w < 0) {
            x += w;
            w = Math.abs(w);
        }
        if (h < 0) {
            y += h;
            h = Math.abs(h);
        }
        return new Rect(x, y, w, h);
    }

    public equals(rect?: Rect) {
        if (!rect) return false;
        return (
            this.left === rect.left &&
            this.top === rect.top &&
            this.width === rect.width &&
            this.height === rect.height
        );
    }

    public toArray() {
        return [this.left, this.top, this.width, this.height];
    }

    public toTuple() {
        return [this.left, this.top, this.width, this.height] as const;
    }

    public toCSS(): CssRect {
        return {
            left: `${this.left}px`,
            top: `${this.top}px`,
            width: `${this.width}px`,
            height: `${this.height}px`,
        };
    }

    public toDotFrame(factor: number) {

        const frame = [] as Point[];

        for (const ln of this.lines()) {
            frame.push(ln.p1);

            const n = Math.ceil(ln.length / factor);
            if (n <= 1) continue;

            const x = ln.length / n;
            const v = ln.toVector().normalize();
            for (let i = 1; i < (n); i++) {
                frame.push(ln.p1.add(v.multiply(x * i)));
            }
        }

        return frame;
    }

    public toShapeInfo() {
        // We don't use memone here because there is some random circular dependency I can't find so just cache manually.
        if (!this.shape) {
            const { left, top, width, height } = this;
            this.shape = ShapeInfo.rectangle({ left, top, width, height });
        }
        return this.shape;
    }

    public toPolyline() {
        const pts = this.points();
        return new Polyline([...pts, pts[0]]);
    }

    public toOval() {
        // new Point(this.left, this.top),
        // new Point(this.left + this.width, this.top),
        // new Point(this.left + this.width, this.top + this.height),
        // new Point(this.left, this.top + this.height),

        return new Polyline(this.points()).toRoundedPath('cubic', [
            this.width / 2,
            this.height / 2,
            this.width / 2,
            this.height / 2,
        ]);
    }

    public toString(): string {
        return `[${this.left}, ${this.top}, ${this.width}, ${this.height}]`;
    }
}
