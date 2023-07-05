import { round } from './Math';

export interface HasXY { x: number, y: number }
export interface HasLeftTop { left: number, top: number }
export interface HasWidthHeight { width: number, height: number }
export type HasPoints =
    readonly Point[] |
    { points(): readonly Point[] } |
    { readonly points: readonly Point[] } |
    { toPoints(): readonly Point[] };

export type PointSource = number | [number, number] | number[] | string | Point | readonly [Point] | HasXY | HasLeftTop | HasWidthHeight;
export type PointMutator = (v: number) => number;

/**
 * Represents an immutable 2d cartesian coordinate or vector.
 */
export class Point {

    /**
     * Predefined Point object that represents a point of [0,0].
     */
    public static readonly zero: Point = new Point(0, 0);

    /**
     * Predefined Point object that represents the cartesian origin [0,0].
     */
    public static readonly origin = new Point(0, 0);

    /**
     * Predefined Point object that represents the maximum positive coordinate possible [2147483647, 2147483647].
     */
    public static readonly max = new Point(2147483647, 2147483647);

    /**
     * Predefined Point object that represents the maximum positive coordinate possible [-2147483647, -2147483647].
     */
    public static readonly min = new Point(-2147483647, -2147483647);

    /**
     * Predefined Point object that represents a unit vector "up" [0, -1].
     */
    public static readonly up = new Point(0, -1);

    /**
     * Predefined Point object that represents a unit vector "down" [0, 1].
     */
    public static readonly down = new Point(0, 1);

    /**
     * Predefined Point object that represents a unit vector "left" [-1, 0].
     */
    public static readonly left = new Point(-1, 0);

    /**
     * Predefined Point object that represents a unit vector "right" [1, 0].
     */
    public static readonly right = new Point(1, 0);

    /**
     * Predefined Point object that represents a unit vector of the positive X axis [1, 0].
     */
    public static readonly x = new Point(1, 0);

    /**
     * Predefined Point object that represents a unit vector of the positive Y axis [0, 1].
     */
    public static readonly y = new Point(0, 1);

    /**
     * Accepts an array of PointSources and returns a Point that represents the average of the array contents.
     *
     * @param points the points.
     */
    public static average(points: PointSource[]): Point {
        if (!points.length) {
            return Point.zero;
        }
        let x = 0;
        let y = 0;
        for (const ps of points) {
            const p = Point.from(ps);
            x += p.x;
            y += p.y;
        }
        return new Point(x / points.length, y / points.length);
    }

    /**
     * Accepts an array of PointSources and returns a flat array of all their xy components in order.
     *
     * @param points the points.
     */
    public static flatten(points: PointSource[]): number[] {
        return points.map(x => Point.from(x)).flatMap(x => x.toArray());
    }

    /**
     * Accepts a string expressing point data and parses it into a Point object.  The parse operation looks for the first two distinct
     * numbers inside the string and uses these as the X and Y values respectively.  Therefore, the following different inputs should
     * all be accepted:
     * - [50, 50]
     * - 100, 100
     * - (100 100)
     *
     * The function will throw an error on any failure state.
     *
     * @param pts the point in string form
     */
    public static parse(val: string): Point {
        if (val === null || typeof (val) !== 'string') {
            throw new Error(`Point.parse: ${val} is not a valid input.`);
        }
        const [x, y] = (val.match(/\d*\.?\d*/g) || [])
            .filter(v => !!v)
            .map(parseFloat);
        if (x === undefined || y === undefined) {
            throw new Error(`Point.parse: ${val} is not a valid input.`);
        }
        return new Point(x, y);
    }

    /**
     * Accepts a variety of different data types/formats and attempts to convert them into a Point object.  If no conversion can be made
     * or the "pts" is null/undefined, the function will throw an error.
     *
     * @param pts the form of data containing the point values
     */
    public static from(pts: PointSource): Point;
    public static from(pts: any, prefix: string): Point;
    public static from(pts: any, prefix?: string): Point {
        if (pts !== null && pts !== undefined) {
            if (!!prefix && typeof (pts) === 'object') {
                const x = prefix + 'X';
                const y = prefix + 'Y';
                if (!(x in pts && y in pts)) {
                    throw new Error(`Point.from: prefixed fields not present in object.`);
                }
                return Point.from([pts[x], pts[y]]);
            }
            if (pts instanceof Point) {
                return pts;
            }
            if (typeof (pts) === 'number') {
                return new Point(pts, pts);
            }
            if (typeof (pts) === 'string') {
                return Point.parse(pts);
            }
            if (Array.isArray(pts)) {
                if (pts.length === 1) {
                    if (typeof (pts[0]) === 'number') {
                        return new Point(pts[0], pts[1]);
                    }
                    else {
                        return Point.from(pts[0]);
                    }
                }
                if (pts.length === 2) {
                    return new Point(pts[0], pts[1]);
                }
            }
            if ('x' in pts && 'y' in pts) {
                return new Point(pts.x, pts.y);
            }
            if ('left' in pts && 'top' in pts) {
                return new Point(pts.left, pts.top);
            }
            if ('width' in pts && 'height' in pts) {
                return new Point(pts.width, pts.height);
            }
        }
        throw new Error(`Point.from: ${pts} is not a valid input.`);
    }

    /**
     * Accepts an array of numbers and extracts a Point from the specified index and index + 1 using the values as X and Y respectively.
     *
     * @param buffer the array.
     * @param index the starting index.
     */
    public static fromBuffer(buffer: number[], index: number = 0): Point {
        if (buffer.length < (index + 2)) {
            throw new Error('fromBuffer failure: buffer not long enough.');
        }
        return new Point(buffer[index], buffer[index + 1]);
    }

    /**
     * Converts an ARROW_KEY into a unit vector.  Returns Point.zero if keyCode is not an ARROW_KEY.
     *
     * @param keyCode the key code.
     */
    public static fromKeyCode(keyCode: number) {
        switch (keyCode) {
            case 37: return Point.left;
            case 38: return Point.up;
            case 39: return Point.right;
            case 40: return Point.down;
        }
        return Point.zero;
    }

    /**
     * Accepts an object conforming to the HasPoints interface and returns a list of Point objects resolved from the input object.
     *
     * @param hasPoints the object that has points.
     */
    public static manyFrom(hp: Point | HasPoints): Point[] {
        if (hp instanceof Point) {
            return [hp];
        }
        if ('points' in hp) {
            return this.manyFrom(typeof (hp.points) === 'function' ? hp.points() : hp.points);
        }
        if ('toPoints' in hp && typeof (hp.toPoints) === 'function') {
            return this.manyFrom(hp.toPoints());
        }
        if (Array.isArray(hp)) {
            if (Point.isPointLike(hp[0])) {
                return hp;
            }
        }
        throw new Error(`Point: ${hp} is not a valid HasPoints`);
    }

    /**
     * Returns a Point that represents the vector between the two specified Points (treated as locations).
     *
     * @param origin the origin location
     * @param dest the destination location
     */
    public static vector(origin: PointSource, dest: PointSource): Point {
        return Point.from(dest).subtract(Point.from(origin));
    }

    /**
     * Returns a value indicating whether or not the specified input has X and Y properties.
     *
     * @param input the input object
     */
    public static isPointLike(input: any): boolean {
        return (
            ('x' in input && typeof input.x === 'number') &&
            ('y' in input && typeof input.y === 'number')
        );
    }

    /**
     * Gets the X value of the point.
     */
    public readonly x: number;

    /**
     * Gets the Y value of the point.
     */
    public readonly y: number;

    /**
     * Initializes a new instance of Point.
     *
     * @param x the x value.
     * @param y the y value.
     */
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }

    /**
     * Gets the W value of the point, which is the same as X, but under a different name for readability when working with a point that
     * represents size rather than a location or vector.
     */
    public get w() {
        return this.x;
    }

    /**
     * Gets the H value of the point, which is the same as Y, but under a different name for readability when working with a point that
     * represents size rather than a location or vector.
     */
    public get h() {
        return this.y;
    }

    /**
     * Rounds both components of the Point to the specified precision (defaulting to zero).
     */
    public round(precision?: number): Point {
        return this.apply(c => round(c, precision));
    }

    /**
     * Clamps the components to the inclusive range of the min and max components.
     */
    public clamp(min: Point, max: Point): Point {
        return new Point(
            Math.min(Math.max(this.x, min.x), max.x),
            Math.min(Math.max(this.y, min.y), max.y),
        );
    }

    /**
     * Ceilings both components of the Point using Math.ceil and returns the result.
     */
    public ceil(): Point {
        return this.apply(Math.ceil);
    }

    /**
     * Floors both components of the Point using Math.floor and returns the result.
     */
    public floor(): Point {
        return this.apply(Math.floor);
    }

    /**
     * Computes the inverse of the Point, essentially both components multiplied by -1.
     */
    public inverse() {
        return this.apply(v => v * -1);
    }

    /**
     * Alias for Point.magnitude().
     */
    public length(): number {
        return this.magnitude();
    }

    /**
     * Computes the magnitude of the Point.  If the Point represents a vector then the magnitude is the length of the vector.  If the Point
     * represents a location then the magnitude is the direct distance from the origin [0, 0] to the Point.
     *
     * Calculating the magnitude of a Point is performed using Pythagorean Theorem (PT).  PT states that given any right angled triangle,
     * the area of a square created from the hypotenuse (longest side) is equal to the sum of the area of the other two sides, often
     * written as A²+B²=C².  For our Point value, we can create a right angled triangle by moving from the origin [0,0], along the X
     * axis by Point.x and up the Y axis by Point.y.
     *
     * So given that A²+B²=C², we know that the length of A is Point.x and the length of B is Point.y.  To calculate the length of C (which
     * is our Point.magnitude) we can substitude in these values and rearrange our formula to be C=√(Point.x²+Point.y²).
     */
    public magnitude(): number {
        // This could be written as Math.sqrt(this.dot(this)) but its more efficient and more importantly simpler to repeat the expression.
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Treating the value of the Point as a vector, computes the unit vector of the Point.  The unit vector is a vector that has a magnitude
     * of 1.  Calcualting the unit vector is caculated by v * 1/||v||.  In other words, multiply the vector by one over the magnitude of the
     * vector.
     */
    public normalize(): Point {
        const len = this.magnitude();
        if (len === 1) return this;
        if (len > 0.00001) return this.multiply(1 / len);
        return Point.zero;
    }

    /**
     * Treating the value of the Point as a vector, computes a perpendicular vector which is rotated 90 degrees counter-clockwise from the
     * initial vector.  For the clockwise varation see `Point.perpcw`.
     */
    public perp(): Point {
        return new Point(this.y, -this.x);
    }

    /**
     * Treating the value of the Point as a vector, computes a perpendicular vector which is rotated 90 degrees clockwise from the initial
     * vector.  For the counter-clockwise varation see `Point.perp`.
     */
    public perpcw(): Point {
        return new Point(-this.y, this.x);
    }

    /**
     * Assuming the point is a vector, determines the quadrant the vector is in.  The quadrants are clockwise from south east on the clock
     * face.
     */
    public quadrant(): 0 | 1 | 2 | 3 {
        const a = this.angle();
        if (a > 0) return a < 1.5708 ? 0 : 1;
        else return a < -1.5708 ? 2 : 3;
    }

    /**
     * Considering the value of the Point as a vector, computes the angle of the vector relative to the specified vector.  If no vector is
     * specified then the unit vector for the positive x-axis is used; [1,0].  The return value is the in the range of [-π , +π] radians
     * where positive indicates the angle is clockwise, negative counter clockwise.
     *
     * While you can compute the angle between two (normalized) vectors using A·B = cos(θ), this technique does not give us the direction
     * (sign) of the angle.  Instead we use the common technique of using atan2(A⨯B,A·B) where the cross product is the perpendicular dot
     * product.  This technique uses the arctan value of a triangle constructed from the dot and cross of the two vectors, mirrors the angle
     * between the two vectors but along the X axis.  atan2 does the work of normalizing the return value to be [-π , +π].
     */
    public angle(relativeTo?: PointSource): number {
        const to = Point.from(relativeTo || Point.right);
        return Math.atan2(this.cross(to), this.dot(to));
    }

    // TODO
    public rotate(radians: number): Point {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return Point.from([
            (this.x * cos) + (this.y * -sin),
            (this.x * sin) + (this.y * cos),
        ]);
    }

    /**
     * Computes the direct distance from this Point to the specified Point.  Computing the distance between two points is a simple process
     * of subtracting one Point from the other to create a Point that represents the vector of the distance between them, then using
     * magnitude() to compute the length of this vector Point to give us the distance.
     *
     * @param to the Point we want to measure the distance to.
     */
    public distanceTo(to: Point): number {
        return this.subtract(to).magnitude();
    }

    /**
     * Computes the direct distance from this Point to the specified Points (see distanceTo) and returns the nearest point in the set.  If
     * empty set passed "this" is returned.
     *
     * @param pts the Points to search through.
     */
    public nearestOf(pts: Point[]): Point {
        let sd = -1;
        let sp = null as Point | null;
        for (const np of pts) {
            const nd = this.distanceTo(np);
            if (sd < 0 || nd < sd) {
                sd = nd;
                sp = np;
            }
        }
        return sp ?? this;
    }

    /**
     * Computes the direct distance from this Point to the specified Points (see distanceTo) and returns the farthest point in the set.  If
     * empty set passed "this" is returned.
     *
     * @param pts the Points to search through.
     */
    public farthestOf(pts: Point[]): Point {
        let sd = -1;
        let sp = null as Point | null;
        for (const np of pts) {
            const nd = this.distanceTo(np);
            if (sd < 0 || nd > sd) {
                sd = nd;
                sp = np;
            }
        }
        return sp ?? this;
    }

    /**
     * The dot product of two vectors, often written as A·B where A and B are vectors, is a scalar value produced by multiplying the two x
     * components and the two y components together and them summing the result.  The value returned depends on the length of both vectors
     * as well as the angle between them.  This operation is sometimes called the _scalar product_.
     *
     * @param pts
     */
    public dot(pts: PointSource): number {
        const pt = Point.from(pts);
        return this.x * pt.x + this.y * pt.y;
    }

    /**
     * Calculates the perpendicular dot product of this vector and the specified vector.  The perpendicular dot product is sometimes
     * referred to as the 2D equivalent of the cross product.  Cross product is a computation only relevant to 3D vectors that procudes a
     * new vector as an output.  The vector is perpendicular to the two input vectors.  In 2D, the cross product would essentially be a
     * vector along the Z axis, either coming up from or going into the page/surface.  The magnitude/length of this vector would be equal to
     * the 2D perpendicular dot product.
     *
     * The name of this method has been set to "cross" because many other libraries and references to this computation refer to it as the
     * cross product, even though technically it is not.  When researching its properties further it may be useful to search for 2D perp dot
     * product as well as 2D cross product.
     *
     * @param pts
     */
    public cross(pts: PointSource): number {
        const pt = Point.from(pts);
        return (this.x * pt.y - this.y * pt.x) * -1; // -1 because positive is down for us
    }

    /**
     * Applies the specified mutator to both components of the Point and returns the result.
     *
     * @example
     * // Returns [10,10]
     * new Point(100, 100).apply(x => x / 10);
     * * // Returns [10,10]
     * new Point(10.5, 100.5).apply(Math.floor);
     *
     * @param mutator the mutator function.
     */
    public apply(mutator: PointMutator): Point {
        return new Point(mutator(this.x), mutator(this.y));
    }

    /**
     * Adds the specified point value to this point and returns the result.
     *
     * @param pts the point source representing the value to add.
     */
    public add(pts: PointSource): Point {
        const pt = Point.from(pts);
        return new Point(this.x + pt.x, this.y + pt.y);
    }

    /**
     * Subtracts the specified point value from this point and returns the result.
     *
     * @param pts the point source representing the value to subtract.
     */
    public subtract(pts: PointSource): Point {
        const pt = Point.from(pts);
        return new Point(this.x - pt.x, this.y - pt.y);
    }

    /**
     * Multiplies this point by the specified point value and returns the result.
     *
     * @param pts the point source representing the multipler.
     */
    public multiply(pts: PointSource): Point {
        const pt = Point.from(pts);
        return new Point(this.x * pt.x, this.y * pt.y);
    }

    /**
     * Divides this point by the specified point value and returns the result.
     *
     * @param pts the point source representing the divisor.
     */
    public divide(pts: PointSource): Point {
        const pt = Point.from(pts);
        return new Point(this.x / pt.x, this.y / pt.y);
    }

    /**
     * Given a Point that represents a vector from the origin, this method projects the current Point (treated also as a vector from the
     * origin) onto the specified axis vector.  To do this we normalize both vectors and calculate the dot product of the axis and the
     * current vector which gives us the projection ratio.  With this, we can expand the normalized axis by the length of the current
     * vector multiplied by the ratio to give us the project point.
     *
     * @param axis the axis vector
     */
    public project(axis: Point) {
        const na = axis.normalize();
        const nv = this.normalize();
        const adnv = na.dot(nv);
        return na.multiply(this.length() * adnv);
    }

    /**
     * Given another Point, this method calculates a new Point that is an interpolation of the two points using the specified t value.  t
     * should be a number between 0 and 1 (inclusive) representing a % along the line between the two points to calculate.
     *
     * @param to the point to use as the end of the line.
     * @param t where to interpolate to.
     */
    public lerp(to: Point, t: number): Point {
        const omt = 1.0 - t;
        return new Point(
            this.x * omt + to.x * t,
            this.y * omt + to.y * t
        );
    }

    /**
     * Returns a value indicating whether the specified Point represents the same position/vector as this Point.
     *
     * @param another the other point-like object.
     */
    public equals(another: Point): boolean {
        if (!another) throw new Error('Point.equals: specified point was falsey.');
        return this.x === another.x && this.y === another.y;
    }

    /**
     * If either components are NaN, swaps the component to zero.
     */
    public fixNaN(replacement: number = 1): Point {
        return this
            .apply(x => isNaN(x) || Number.isNaN(x) ? replacement : x)
            .apply(x => !Number.isFinite(x) ? replacement : x);
    }

    /**
     * Returns a string representation of the Point using the specified format type.  If not type specified then toString() is returned.
     * The types are as follows:
     * - object: {"x":}
     *
     * @param fmt the format to use.
     */
    public format(fmt?: 'object' | 'array' | 'x' | 'svg') {
        if (fmt === 'object') return `{x:${this.x}, y:${this.y}}`;
        if (fmt === 'array') return `[${this.x}, ${this.y}]`;
        if (fmt === 'x') return `${this.x}x${this.y}`;
        if (fmt === 'svg') return `${this.x} ${this.y}`;
        return this.toString();
    }

    /**
     * Returns an size-2 array respectively containing the X and Y values of the Point.
     */
    public toArray(): [number, number] {
        return [this.x, this.y];
    }

    /**
     * Returns an object with the CSS properties for left/top applied from the x/y values.
     */
    public toCSS() {
        return {
            left: `${this.x}px`,
            top: `${this.y}px`,
        };
    }

    /**
     * Returns a POJO containing "x" and "y" properties respectively with the X and Y values of the Point.
     */
    public toObject(): HasXY {
        return { x: this.x, y: this.y };
    }

    /**
     * Returns a string representation of the Point that for x=50 and y=50 will look liks this: [50,50]
     */
    public toString(): string {
        return `[${this.x},${this.y}]`;
    }
}
