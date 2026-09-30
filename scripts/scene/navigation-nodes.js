import * as THREE from 'three';

const NODE_STYLE = {
    room: { material: 'node', radius: 0.1 },
    stair: { material: 'stairNode', radius: 0.15 },
    hub: { material: 'hubNode', radius: 0.09 }
};

/** Creates the optional visual overlay for graph nodes. */
export function createNavigationNodes(graph, materials) {
    const group = new THREE.Group();
    const geometries = new Map();
    Object.values(graph.nodes).forEach(node => {
        if (node.type === 'room') return;
        const style = NODE_STYLE[node.type] ?? NODE_STYLE.room;
        const geometry = geometries.get(style.radius) ?? new THREE.SphereGeometry(style.radius, 8, 8);
        geometries.set(style.radius, geometry);
        const marker = new THREE.Mesh(geometry, materials[style.material].clone());
        marker.position.set(node.x, node.y + 0.12, node.z);
        marker.userData.floor = node.floor;
        marker.userData.baseOpacity = marker.material.opacity;
        group.add(marker);
    });
    return group;
}
