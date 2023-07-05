import React from "react";
import styled from "styled-components";
import { City } from "../model/City";

const Graphic = styled.div<{ url: string }>`
    background: url(${p => p.url});
    background-size: cover;
    position: absolute;
    inset: -1px;
`;

const Frame = styled.div`
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
`;

export const CityVisual = ({ city }: { city: City }) => {

    const transform = `translate(-50%, -50%) translate(${city.position.x}px, ${city.position.y}px)`;
    const style = { transform };

    return <Frame style={style}>
        <Graphic url={`/assets/city${city.type}.png`} />
    </Frame>
}