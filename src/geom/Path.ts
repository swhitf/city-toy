import { ShapeInfo } from 'kld-intersections';
import { Geometry, IntersectResult } from './Geometry';
import { Line } from './Line';
import { Matrix } from './Matrix';
import { HasPoints, Point } from './Point';
import { Rect } from './Rect';

export type PathCommand =
    ['M' | 'm' | 'L' | 'l', Point] |
    ['Q' | 'q', Point, Point] |
    ['C' | 'c', Point, Point, Point] |
    ['A' | 'a', Point, number, 0 | 1, 0 | 1, Point] |
    ['Z']
    ;

export class Path implements Geometry, Iterable<PathCommand> {

    public static ellipse(cx: number, cy: number, rx: number, ry: number) {
        // Impl based on:
        // https://stackoverflow.com/questions/59011294/ellipse-to-path-convertion-using-javascript
        // Magic number that allows us to closely appromixate an arc with cubic bezier
        const kappa = 0.5522847498307933984022516322796;
        const ox = rx * kappa; // x offset for the control point
        const oy = ry * kappa; // y offset for the control point
        return new Path([
            ['M', new Point(cx - rx, cy)],
            ['C', new Point(cx - rx, cy - oy), new Point(cx - ox, cy - ry), new Point(cx, cy - ry)],
            ['C', new Point(cx + ox, cy - ry), new Point(cx + rx, cy - oy), new Point(cx + rx, cy)],
            ['C', new Point(cx + rx, cy + oy), new Point(cx + ox, cy + ry), new Point(cx, cy + ry)],
            ['C', new Point(cx - ox, cy + ry), new Point(cx - rx, cy + oy), new Point(cx - rx, cy)],
            ['Z'],
        ]);
    }

    public static from(hp: HasPoints): Path {
        const points = Point.manyFrom(hp);
        const commands = points.map((x, i) => [i === 0 ? 'M' : 'L', x]) as PathCommand[];
        return new Path(commands.concat([['Z']]));
    }

    public static moveTo(p: Point): PathBuilder {
        return new PathBuilder().moveTo(p);
    }

    public readonly commands: readonly PathCommand[];

    constructor(commands: readonly PathCommand[]) {
        if (!(commands[0] && (commands[0][0] === 'M' || commands[0][0] === 'Z'))) {
            throw new Error('Path: first command must be M or Z.');
        }
        this.commands = commands;
    }

    public get bounds() {
        const pts = this.commands.flatMap((c: any[]) => c.filter(x => x instanceof Point) as Point[]);
        return Rect.fromPoints(pts);
    }

    public get closed() {
        return this.commands.length && this.commands[this.commands.length - 1][0] === 'Z';
    }

    public concat(...paths: Path[]): Path {
        return new Path([this, ...paths].flatMap(x => x.commands));
    }

    public contains(point: Point): boolean {
        const off = new Point(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
        const ray = new Line(off, point);
        const result = this.intersectPoints(ray);
        return result && result.length % 2 === 1;
    }

    public nearestPoint(to: Point): Point | null {
        const pc = this.bounds.center();
        const tv = Point.vector(pc, to).normalize();
        const tn = tv.multiply(Math.max(this.bounds.width, this.bounds.height) * 10);

        const hits = this.intersectPoints(new Line(pc, tn));
        return !!hits && hits.length ? to.nearestOf(hits) : null;
    }

    public intersects(another: Geometry): boolean {
        return !!this.intersectPoints(another);
    }

    public intersectPoints(another: Geometry): IntersectResult {
        return Geometry.intersect(this, another);
    }

    /**
     * Applies the specified Matrix to the data of this Path and returns a new Path with the transformation result.
     *
     * @param mt the matrix.
     */
    public transform(mt: Matrix): Path {
        return new Path(this.commands.map((c: any[]) =>
            c.map(x => x instanceof Point ? mt.apply(x) : x) as PathCommand
        ));
    }

    public toShapeInfo() {
        return ShapeInfo.path(this.toString());
    }

    public toString(leaveOpen?: boolean): string {

        const path = [] as string[];

        for (const c of this) {
            for (const x of c) {
                if (x instanceof Point) {
                    path.push(x.format('svg'));
                }
                else if (!leaveOpen || x !== 'Z') {
                    path.push(x.toString());
                }
            }
        }

        return path.join(' ');
    }

    public toPath2D() {
        return new Path2D(this.toString());
    }

    [Symbol.iterator](): Iterator<PathCommand> {
        return this.commands[Symbol.iterator]();
    }
}

class PathBuilder {

    private readonly commands: PathCommand[] = [];

    public moveTo(p: Point): this {
        this.commands.push(['M', p]);
        return this;
    }

    public cubeTo(cp1: Point, cp2: Point, p: Point): this {
        this.commands.push(['C', cp1, cp2, p]);
        return this;
    }

    public quadTo(cp: Point, p: Point): this {
        this.commands.push(['Q', cp, p]);
        return this;
    }

    public lineTo(p: Point): this {
        this.commands.push(['L', p]);
        return this;
    }

    public build(close?: boolean): Path {
        if (close) {
            this.commands.push(['Z']);
        }
        return new Path(this.commands);
    }
}
