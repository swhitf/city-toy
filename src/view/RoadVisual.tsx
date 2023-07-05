import React from "react";
import styled from "styled-components";
import { toDegrees } from "../geom/Math";
import { Point } from "../geom/Point";
import { Road } from "../model/Road";

const Divide = styled.div`
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 3px;
    transform: translateY(-50%);
    background-image: linear-gradient(to right, white 50%, rgba(255,255,255,0) 0%);
    background-position: bottom;
    background-size: 30px 3px;
    background-repeat: repeat-x;
`;

const Frame = styled.div`
    position: absolute;
    height: 40px;
    background: dimgray;
    transform-origin: 0% 50%;
`;

export const RoadVisual = ({ road }: { road: Road }) => {

    const from = road.from.position;
    const to = road.to.position;
    const vec = Point.vector(from, to);

    const transform = `translate(0, -50%) translate(${from.x}px, ${from.y}px) rotate(${toDegrees(vec.angle())}deg) `;
    const style = {
        width: vec.length(),
        transform,
    };

    return <Frame style={style}>
        <Divide />
    </Frame>
}