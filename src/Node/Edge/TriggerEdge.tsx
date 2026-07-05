import {
    EdgeToolbar,
    getBezierPath,
    BaseEdge,
    EdgeProps,
    useReactFlow,
} from '@xyflow/react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCircleXmark} from "@fortawesome/free-regular-svg-icons";

export function TriggerEdge(props: EdgeProps) {
    const [edgePath, centerX, centerY] = getBezierPath(props);
    const {deleteElements, getEdges} = useReactFlow();
    const deleteEdge = () => {
        const edge = getEdges().find((e) => e.id === props.id);
        if (edge) deleteElements({edges: [edge]});
    };
    return (
        <>
            {/* 触发流：橙色虚线 */}
            <BaseEdge id={props.id} path={edgePath} style={{
                stroke: '#F59E0B',
                strokeWidth: 1.5,
                strokeDasharray: '5,4',
            }}/>
            <EdgeToolbar edgeId={props.id} x={centerX} y={centerY} isVisible>
               <span
                   onClick={deleteEdge}
                   className="bg-amber-50 w-4 h-4 flex items-center justify-center rounded-full cursor-pointer border border-amber-300"
               >
                <FontAwesomeIcon
                     icon={faCircleXmark}
                     className="text-amber-500"
                     size="1x"
                />
                </span>
            </EdgeToolbar>
        </>
    );
}
