const NODE_SPACING = 0.4;
const CORRIDOR_LINK_PAD = 0.45;
const CORRIDOR_NODE_LINK_DISTANCE = 0.6;
const STAIR_NODE_LINK_DISTANCE = 1.6;

export function buildGraph(roomMeshes, stairsByFloor, corridorsByFloor) {
    const nodes = {};
    const adjacency = {};
    const addNode = (id, x, y, z, floor, name, type) => {
        nodes[id] = { x, y, z, floor, name, type };
    };
    const link = (a, b, extra = 0) => {
        if (!nodes[a] || !nodes[b]) return;
        if ((adjacency[a] ?? []).some(edge => edge.to === b)) return;
        const first = nodes[a];
        const second = nodes[b];
        const cost = Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z) + extra;
        (adjacency[a] ??= []).push({ to: b, cost });
        (adjacency[b] ??= []).push({ to: a, cost });
    };

    Object.entries(roomMeshes).forEach(([key, mesh]) => {
        const { floor, name } = mesh.userData;
        addNode(key, mesh.position.x, mesh.position.y - 0.7, mesh.position.z, floor, name, 'room');
    });

    const floors = Object.keys(corridorsByFloor).map(Number).sort((a, b) => a - b);
    floors.forEach(floor => {
        const corridorIds = [];
        (corridorsByFloor[floor] ?? []).forEach((corridor, index) => {
            const sampled = sampleCorridor(corridor, index, floor);
            sampled.forEach(node => addNode(node.id, node.x, corridor.y, node.z, floor, '복도', 'hub'));
            for (let i = 0; i < sampled.length - 1; i++) link(sampled[i].id, sampled[i + 1].id);
            corridorIds.push(sampled.map(node => node.id));
        });

        const corridors = corridorsByFloor[floor] ?? [];
        for (let i = 0; i < corridors.length; i++) {
            for (let j = i + 1; j < corridors.length; j++) {
                if (!boxesTouch(corridors[i], corridors[j], CORRIDOR_LINK_PAD)) continue;
                linkClosestPairs(corridorIds[i], corridorIds[j], nodes, link, CORRIDOR_NODE_LINK_DISTANCE);
            }
        }

        const hubs = corridorIds.flat();
        const nearestHub = (x, z) => hubs.reduce((best, id) => {
            const node = nodes[id];
            const distance = Math.hypot(node.x - x, node.z - z);
            return distance < best.distance ? { id, distance } : best;
        }, { id: null, distance: Infinity }).id;

        Object.keys(nodes).filter(id => nodes[id].floor === floor && nodes[id].type === 'room').forEach(id => {
            const room = nodes[id];
            const hubId = nearestHub(room.x, room.z);
            const hub = nodes[hubId];
            if (!hub) return;
            room.x = hub.x;
            room.y = hub.y;
            room.z = hub.z;
            link(id, hubId);
        });

        (stairsByFloor[floor] ?? []).forEach(stair => {
            addNode(stair.id, stair.x, stair.y, stair.z, floor, stair.name, 'stair');
            link(stair.id, nearestHub(stair.x, stair.z), 0.25);
        });
    });

    floors.forEach((floor, index) => {
        const next = floors[index + 1];
        if (!next) return;
        (stairsByFloor[floor] ?? []).forEach(stair => {
            const match = (stairsByFloor[next] ?? []).reduce((best, candidate) => {
                const distance = Math.hypot(candidate.x - stair.x, candidate.z - stair.z);
                return !best || distance < best.distance ? { candidate, distance } : best;
            }, null);
            if (match && match.distance < STAIR_NODE_LINK_DISTANCE) link(stair.id, match.candidate.id, 0.8);
        });
    });

    return { nodes, adjacency };
}

function sampleCorridor(corridor, index, floor) {
    const horizontal = corridor.w >= corridor.d;
    const length = horizontal ? corridor.w : corridor.d;
    const count = Math.max(2, Math.round(length / NODE_SPACING) + 1);
    const nodes = [];
    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = horizontal ? corridor.x - corridor.w / 2 + t * corridor.w : corridor.x;
        const z = horizontal ? corridor.z : corridor.z - corridor.d / 2 + t * corridor.d;
        nodes.push({ id: `corr|${floor}|${index}|${i}`, x, z });
    }
    return nodes;
}

function boxesTouch(a, b, pad) {
    return Math.abs(a.x - b.x) <= (a.w + b.w) / 2 + pad && Math.abs(a.z - b.z) <= (a.d + b.d) / 2 + pad;
}

function linkClosestPairs(firstIds, secondIds, nodes, link, maxDistance) {
    firstIds.forEach(firstId => {
        secondIds.forEach(secondId => {
            const first = nodes[firstId];
            const second = nodes[secondId];
            const distance = Math.hypot(first.x - second.x, first.z - second.z);
            if (distance <= maxDistance) link(firstId, secondId);
        });
    });
}
