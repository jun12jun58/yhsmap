import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FLOOR_H, TAG, getFloorNumbers, getLayoutBounds } from '../data.js';

function createLabel(text, size = 0.35) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const font = 64;
    context.font = `bold ${font}px "Noto Sans KR", sans-serif`;
    const width = Math.ceil(context.measureText(text).width) + 24;
    const height = font + 20;
    canvas.width = width;
    canvas.height = height;
    context.font = `bold ${font}px "Noto Sans KR", sans-serif`;
    context.fillStyle = 'rgba(30,34,42,0.85)';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#e8eaed';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, width / 2, height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.94, depthTest: false, depthWrite: false }));
    sprite.scale.set(size * (width / height), size, 1);
    sprite.userData.isMapLabel = true;
    sprite.userData.baseOpacity = sprite.material.opacity;
    return sprite;
}

export function createScene(wrap, floorsData) {
    const bounds = getLayoutBounds(floorsData);
    const mirrorX = x => 2 * bounds.cx - x;
    const floors = getFloorNumbers(floorsData);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1d23);
    scene.fog = new THREE.Fog(0x1a1d23, 70, 160);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.zoom = 1.22;
    camera.updateProjectionMatrix();
    const topY = floors.length * FLOOR_H;
    const initialTargetY = topY * 0.45;
    const initialDistance = Math.max(bounds.w * 0.95, bounds.d * 1.4, 24);
    camera.position.set(bounds.cx, initialTargetY + 4, bounds.cz - initialDistance);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    wrap.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(bounds.cx, initialTargetY, bounds.cz);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 6;
    controls.maxDistance = 90;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const directional = new THREE.DirectionalLight(0xffffff, 0.85);
    directional.position.set(bounds.cx + 18, topY + 20, bounds.cz + 12);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 90;
    directional.shadow.camera.left = -40;
    directional.shadow.camera.right = 40;
    directional.shadow.camera.top = 40;
    directional.shadow.camera.bottom = -40;
    scene.add(directional);
    scene.add(new THREE.HemisphereLight(0x88aacc, 0x444422, 0.35));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(bounds.cx, -0.05, bounds.cz);
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(80, 40, 0x3c4043, 0x2d3139);
    grid.position.set(bounds.cx, 0.01, bounds.cz);
    scene.add(grid);

    const materials = {
        room: new THREE.MeshStandardMaterial({ color: 0xe8eaed, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 0.62, depthWrite: false }),
        toilet: new THREE.MeshStandardMaterial({ color: 0xb2dfdb, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 0.66, depthWrite: false }),
        hover: new THREE.MeshStandardMaterial({ color: 0xaecbfa, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.86, depthWrite: false }),
        start: new THREE.MeshStandardMaterial({ color: 0x1a73e8, roughness: 0.5, metalness: 0.15, emissive: 0x0d47a1, emissiveIntensity: 0.4, transparent: true, opacity: 0.98, depthWrite: false }),
        end: new THREE.MeshStandardMaterial({ color: 0xf9ab00, roughness: 0.5, metalness: 0.15, emissive: 0xb06000, emissiveIntensity: 0.35, transparent: true, opacity: 0.98, depthWrite: false }),
        corridor: new THREE.MeshStandardMaterial({ color: 0xc5c9d0, roughness: 0.85, transparent: true, opacity: 0.34, depthWrite: false }),
        stair: new THREE.MeshStandardMaterial({ color: 0x8ab4f8, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.58, depthWrite: false }),
        plate: new THREE.MeshStandardMaterial({ color: 0x3c4043, roughness: 0.9, transparent: true, opacity: 0.16, depthWrite: false }),
        node: new THREE.MeshBasicMaterial({ color: 0x7e57c2, transparent: true, opacity: 0.85 }),
        stairNode: new THREE.MeshBasicMaterial({ color: 0x5c9eff, transparent: true, opacity: 0.95 }),
        hubNode: new THREE.MeshBasicMaterial({ color: 0x26a69a, transparent: true, opacity: 0.7 })
    };

    const roomMeshes = {};
    const stairsByFloor = {};
    const corridorsByFloor = {};
    const mapLabels = [];

    floors.forEach(floor => {
        const group = new THREE.Group();
        group.name = `floor${floor}`;
        scene.add(group);
        const baseY = (floor - 1) * FLOOR_H;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(bounds.w + 2, 0.08, bounds.d + 2), materials.plate.clone());
        plate.position.set(bounds.cx, baseY, bounds.cz);
        plate.userData.floor = floor;
        plate.userData.baseOpacity = plate.material.opacity;
        plate.receiveShadow = true;
        group.add(plate);
        const floorLabel = createLabel(`${floor}층`, 0.84);
        floorLabel.position.set(mirrorX(bounds.minX - 1.6), baseY + 0.5, bounds.minZ);
        floorLabel.userData.floor = floor;
        mapLabels.push(floorLabel);
        group.add(floorLabel);
        stairsByFloor[floor] = [];
        corridorsByFloor[floor] = [];

        floorsData[floor].blocks.forEach(block => {
            if (block.tag === TAG.ORIGIN) return;
            const height = block.tag === TAG.CORRIDOR ? 0.06 : 1.6;
            const material = block.tag === TAG.CORRIDOR ? materials.corridor
                : block.tag === TAG.STAIR ? materials.stair
                    : block.tag === TAG.TOILET ? materials.toilet
                        : materials.room;
            const mirroredX = mirrorX(block.x);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(block.w, height, block.d), material.clone());
            mesh.position.set(mirroredX, baseY + height / 2 + (block.tag === TAG.CORRIDOR ? 0.02 : 0.08), block.z);
            mesh.castShadow = block.tag !== TAG.CORRIDOR;
            mesh.receiveShadow = true;
            mesh.renderOrder = floor;
            const isRoom = block.tag === TAG.ROOM || block.tag === TAG.TOILET;
            mesh.userData = {
                floor,
                name: block.name,
                tag: block.tag,
                isRoom,
                isStair: block.tag === TAG.STAIR,
                defaultMaterial: mesh.material,
                baseOpacity: mesh.material.opacity
            };
            group.add(mesh);

            if (block.tag === TAG.CORRIDOR) {
                corridorsByFloor[floor].push({ ...block, x: mirroredX, y: baseY + 0.2 });
            }
            if (block.tag === TAG.STAIR) {
                stairsByFloor[floor].push({
                    id: `stair|${block.id}`,
                    x: mirroredX,
                    y: baseY + 0.2,
                    z: block.z,
                    floor,
                    name: block.name
                });
            }
            if (isRoom) {
                const roomKey = `${floor}|${block.name}`;
                mesh.userData.roomKey = roomKey;
                roomMeshes[roomKey] = mesh;
                const label = createLabel(block.name, block.name.length > 8 ? 0.36 : 0.4);
                label.position.set(mirroredX, baseY + 2.23, block.z);
                label.userData.floor = floor;
                label.userData.roomKey = roomKey;
                mapLabels.push(label);
                group.add(label);
                mesh.userData.label = label;
            }
        });
    });

    floors.forEach((floor, index) => {
        const next = floors[index + 1];
        if (!next) return;
        stairsByFloor[floor].forEach(first => {
            const second = nearestStair(stairsByFloor[next], first);
            if (second && Math.hypot(first.x - second.x, first.z - second.z) < 2.2) {
                addStairColumn(scene, first, second);
            }
        });
    });

    let lastFocusKey = null;
    let focusedFloorState = null;
    let endpointKeysState = new Set();
    let cameraRoomKey = null;
    const setFloorFocus = (focusedFloor, endpointKeys = []) => {
        const endpointList = [...new Set(endpointKeys)].sort();
        const focusKey = `${focusedFloor ?? 'all'}|${endpointList.join(',')}`;
        if (focusKey === lastFocusKey) return;
        lastFocusKey = focusKey;
        focusedFloorState = focusedFloor;
        endpointKeysState = new Set(endpointList);
        const endpoints = new Set(endpointList);
        scene.traverse(object => {
            const { floor, otherFloor, roomKey, isRoom, baseOpacity } = object.userData;
            if (typeof floor !== 'number' || typeof baseOpacity !== 'number' || !object.material) return;
            const isEndpoint = roomKey && endpoints.has(roomKey);
            const isFocused = focusedFloor == null || floor === focusedFloor || otherFloor === focusedFloor || isEndpoint;
            object.material.opacity = isFocused
                ? (focusedFloor !== null && floor === focusedFloor && isRoom ? Math.max(baseOpacity, 0.92) : baseOpacity)
                : baseOpacity * 0.14;
        });
        if (cameraRoomKey) {
            const cameraRoom = roomMeshes[cameraRoomKey];
            if (cameraRoom) cameraRoom.material.opacity = Math.min(cameraRoom.material.opacity, 0.18);
        }
    };
    const updateCameraRoomFocus = position => {
        let nextRoomKey = null;
        let closestFloorDistance = Infinity;
        for (const [roomKey, mesh] of Object.entries(roomMeshes)) {
            const { width, depth } = mesh.geometry.parameters;
            if (Math.abs(position.x - mesh.position.x) > width / 2
                || Math.abs(position.z - mesh.position.z) > depth / 2) continue;
            const floorDistance = Math.abs(position.y - mesh.position.y);
            if (floorDistance < closestFloorDistance) {
                closestFloorDistance = floorDistance;
                nextRoomKey = roomKey;
            }
        }
        cameraRoomKey = nextRoomKey;
        for (const [roomKey, mesh] of Object.entries(roomMeshes)) {
            const { floor, baseOpacity } = mesh.userData;
            const isEndpoint = endpointKeysState.has(roomKey);
            const isFocused = focusedFloorState == null || floor === focusedFloorState || isEndpoint;
            const focusedOpacity = isFocused
                ? (focusedFloorState !== null && floor === focusedFloorState ? Math.max(baseOpacity, 0.92) : baseOpacity)
                : baseOpacity * 0.14;
            mesh.material.opacity = roomKey === cameraRoomKey ? Math.min(focusedOpacity, 0.18) : focusedOpacity;
        }
    };
    const sortLabelsByCamera = () => {
        const ordered = [...mapLabels].sort((a, b) => camera.position.distanceToSquared(b.position) - camera.position.distanceToSquared(a.position));
        ordered.forEach((label, index) => { label.renderOrder = 1000 + index; });
    };

    return { scene, camera, renderer, controls, materials, roomMeshes, stairsByFloor, corridorsByFloor, bounds, floors, setFloorFocus, updateCameraRoomFocus, sortLabelsByCamera };
}

function nearestStair(list, stair) {
    return list.reduce((best, candidate) => {
        const distance = Math.hypot(candidate.x - stair.x, candidate.z - stair.z);
        return !best || distance < best.distance ? { stair: candidate, distance } : best;
    }, null)?.stair;
}

function addStairColumn(scene, first, second) {
    const geometry = new THREE.CylinderGeometry(0.22, 0.22, FLOOR_H * 0.95, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x5c9eff, transparent: true, opacity: 0.35, roughness: 0.5 });
    const column = new THREE.Mesh(geometry, material);
    column.position.set((first.x + second.x) / 2, (first.y + second.y) / 2 + FLOOR_H / 2, (first.z + second.z) / 2);
    column.userData.floor = first.floor;
    column.userData.otherFloor = second.floor;
    column.userData.baseOpacity = material.opacity;
    scene.add(column);
}
