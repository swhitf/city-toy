import React, { useCallback, useState } from 'react';
import { Point } from './geom/Point';
import { addCity, randomModel } from './model/Model';
import { CityVisual } from './view/CityVisual';
import { RoadVisual } from './view/RoadVisual';
import { View } from './view/View';

export const App = () => {

    const [model, setModel] = useState(randomModel());
    const [history, setHistory] = useState([] as any[]);

    const onAddCity = useCallback((at: Point) => {
        setModel(m => addCity(m, at));
    }, []);

    return <View onAction={onAddCity}>
        {model.roads.map(road => <RoadVisual key={road.id} road={road} />)}
        {model.cities.map(city => <CityVisual key={city.id} city={city} />)}
    </View>
};