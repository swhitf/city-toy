import { ShapeInfo } from 'kld-intersections';
import { Geometry, IntersectResult } from './Geometry';
import { Matrix } from './Matrix';
import { Point } from './Point';


export type LineSource = readonly Point[];

export class Line implements Geometry {

    public readonly p1: Point;
    public readonly p2: Point;

    public static ray(origin: Point, vector: Point): Line {
        const mag = Number.MAX_SAFE_INTEGER;
        return new Line(
            origin,
            origin.add(vector.normalize().multiply(mag))
        );
    }

    public static from(ls: LineSource): Line {
        if (ls !== null && ls !== undefined) {
            if (Array.isArray(ls)) {
                if (ls[0] instanceof Point) {
                    return new Line(ls[0], ls[1]);
                }
            }
        }
        throw new Error(`Line: ${ls} is not a valid source.`);
    }

    constructor(p1: Point, p2: Point) {
        this.p1 = p1;
        this.p2 = p2;
    }

    public get direction(): Point {
        return this.toVector().normalize();
    }

    public get length(): number {
        return this.toVector().length();
    }

    public get mid(): Point {
        return new Point(
            (this.p1.x + this.p2.x) / 2,
            (this.p1.y + this.p2.y) / 2
        );
    }

    public get reverse(): Line {
        return new Line(this.p2, this.p1);
    }

    /**
     * Applies the specified Matrix to the data of this Line and returns a new Line with the transformation result.
     *
     * @param mt the matrix.
     */
    public transform(mt: Matrix): Line {
        return new Line(mt.apply(this.p1), mt.apply(this.p2));
    }

    public rotate(origin: Point, by: number) {
        return this.transform(
            Matrix.identity
                .translate(origin)
                .rotate(by)
                .translate(origin.multiply(-1))
        );
    }

    public extend(amount: number): Line {
        const v = this.p2.subtract(this.p1).normalize();
        return new Line(
            this.p1.add(v.multiply(-amount)),
            this.p2.add(v.multiply(amount)),
        );
    }

    public extrude(lhs: number, rhs: number = 0) {
        const normal = this.toVector().perp().normalize();
        return [
            this.p1.add(normal.multiply(lhs)),
            this.p2.add(normal.multiply(lhs)),
            this.p2.add(normal.multiply(rhs * -1)),
            this.p1.add(normal.multiply(rhs * -1)),
        ];
    }

    // public walk(t: number): [Point, Point] {
    //     t = Math.max(0, Math.min(1, t));
    //     const v = this.toVector().multiply(t);
    //     return [this.p1.add(v), v];
    // }

    public distanceTo(pt: Point): number {

        const px = this.p2.subtract(this.p1);
        const s = px.x * px.x + px.y * px.y;
        let u = ((pt.x - this.p1.x) * px.x + (pt.y - this.p1.y) * px.y) / s;

        if (u > 1) u = 1;
        else if (u < 0) u = 0;

        const x = this.p1.x + u * px.x;
        const y = this.p1.y + u * px.y;

        const dx = x - pt.x;
        const dy = y - pt.y;

        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist;
    }

    public perpDistanceTo(pt: Point): number {
        const A = this.p1;
        const B = this.p2;
        const len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
        const s = ((A.y - pt.y) * (B.x - A.x) - (A.x - pt.x) * (B.y - A.y)) / len2;
        return s * Math.sqrt(len2);
    }

    public nearestPointTo(p: Point) {

        // From:
        // https://math.stackexchange.com/questions/2193720/find-a-point-on-a-line-segment-which-is-the-closest-to-other-point-not-on-the-li

        const a = this.p1;
        const b = this.p2;

        const v = new Point(b.x - a.x, b.y - a.y);
        const u = new Point(a.x - p.x, a.y - p.y);
        const vu = v.x * u.x + v.y * u.y;
        const vv = v.x ** 2 + v.y ** 2;
        const t = -vu / vv;

        if (t < 0) return a;
        if (t > 1) return b;

        return new Point(
            (1 - t) * a.x + t * b.x,
            (1 - t) * a.y + t * b.y,
        );
    }

    public coincidentWith(another: Line): boolean {
        return this.equals(another) || this.equals(another.reverse);
    }

    public connectsWith(another: Line): boolean {
        if (this.p1.equals(another.p1) || this.p1.equals(another.p2)) return true;
        if (this.p2.equals(another.p1) || this.p1.equals(another.p2)) return true;
        return false;
    }

    public intersects(another: Geometry): boolean {
        return !!this.intersectPoints(another);
    }

    public intersectPoint(another: Line): Point | null {
        const result = this.intersectPoints(another);
        return result ? result[0] : null;
    }

    public intersectPoints(another: Geometry): IntersectResult {
        return Geometry.intersect(this, another);
    }

    public equals(another: Line): boolean {
        return this.p1.equals(another.p1) && this.p2.equals(another.p2);
    }

    public toArray(): Point[] {
        return [this.p1, this.p2];
    }

    public toVector(): Point {
        return this.p2.subtract(this.p1);
    }

    public toShapeInfo(): any {
        return ShapeInfo.line(this.p1, this.p2);
    }

    public toTuple(): [Point, Point] {
        return [this.p1, this.p2];
    }

    public project(p: Point) {
        const { p1: a, p2: b } = this;

        const atob = { x: b.x - a.x, y: b.y - a.y };
        const atop = { x: p.x - a.x, y: p.y - a.y };
        const len = atob.x * atob.x + atob.y * atob.y;
        const dot = atop.x * atob.x + atop.y * atob.y;
        const t = Math.min(1, Math.max(0, dot / len));

        // dot = ( b.x - a.x ) * ( p.y - a.y ) - ( b.y - a.y ) * ( p.x - a.x );

        return new Point(
            a.x + atob.x * t,
            a.y + atob.y * t
        );
    }

    // / <summary>
    // / Returns the integer out of the three specified that has the middle value.
    // / </summary>
    // / <param name="a">The first value.</param>
    // / <param name="b">The second value.</param>
    // / <param name="c">The third value.</param>
    // / <returns></returns>
}
