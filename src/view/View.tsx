import React, { PropsWithChildren, useCallback, useState } from 'react';
import styled from 'styled-components';
import { Point } from '../geom/Point';

const Frame = styled.div`
    position: fixed;
    inset: 0;
`;

const Origin = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    will-change: contents;
`;

export type ViewProps = { onAction: (e: any) => void } & PropsWithChildren;

export const View = ({ onAction, children }: ViewProps) => {

    const [camera, setCamera] = useState(new Point(window.innerWidth / 2, window.innerHeight / 2));
    const [dragFrom, setDragFrom] = useState(null as Point);

    const transform = `translate(${camera.x}px, ${camera.y}px)`;
    const style = { transform };

    const onMouseDown = (e: any) => {
        setDragFrom(Point.from(e, 'client'));
    };

    const onMouseMove = useCallback((e: any) => {
        if (dragFrom) {
            const latest = Point.from(e, 'client');
            setCamera(camera.add(latest.subtract(dragFrom)));
        }
    }, [dragFrom]);

    const onMouseUp = useCallback((e: any) => {
        setDragFrom(null);
    }, [dragFrom, camera]);

    const onDoubleClick = useCallback((e: any) => {
        const latest = Point.from(e, 'client');
        onAction(latest.subtract(camera));
    }, [camera]);

    return <Frame {...{ onMouseDown, onMouseMove, onMouseUp, onDoubleClick }}>
        <Origin style={style}>
            {children}
        </Origin>
    </Frame>
}

// export class Origin extends React.Component<{ fixInitialLoadBug?: boolean }> {

//     public static contextType = ContainerScope;

//     public state = {
//         ready: false
//     };

//     @resolve(Camera) camera: Camera;

//     private burdens = new Burdens();
//     private elmt = React.createRef<HTMLDivElement>();

//     public render() {
//         return <OriginRoot ref={this.elmt}>
//             {this.state.ready && this.props.children}
//         </OriginRoot>;
//     }

//     public componentDidMount() {
//         this.burdens.add(this.camera.observe(this.setTransformForCameraState));

//         const init = () => {
//             this.setTransformForCameraState(this.camera.getState());
//             this.setState({ ready: true });
//         };

//         if (this.props.fixInitialLoadBug) {
//             invokeLater(100, init);
//         }
//         else {
//             init();
//         }
//     }

//     public componentWillUnmount = () => this.burdens.destroy();

//     private setTransformForCameraState = (cs: CameraState) => {
//         if (!this.elmt?.current) return;
//         this.elmt.current.style.transform = `scale(${cs.scale}) translate(${cs.position.x * -1}px, ${cs.position.y * -1}px)`;
//     };
// }
