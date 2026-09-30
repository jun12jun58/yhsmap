import * as THREE from 'three';
import { createScene } from '../scene/scene.js';
import { buildGraph } from './graph.js';
import { dijkstra } from './pathfinding.js';
import { createCharacter, createPathController } from '../scene/character.js';
import { createUI } from '../ui/ui.js';
import { setupRoomInteraction } from '../ui/interaction.js';
import { loadFloorsData } from '../data.js';

export async function startApplication(canvasWrap) {
    const floorsData = await loadFloorsData();
    const ui = createUI();
    const world = createScene(canvasWrap, floorsData);
    const { scene, camera, renderer, controls, roomMeshes, stairsByFloor, corridorsByFloor, materials, bounds, setFloorFocus, updateCameraRoomFocus, sortLabelsByCamera } = world;
    const graph = buildGraph(roomMeshes, stairsByFloor, corridorsByFloor);
    const characterParts = createCharacter(scene);
    const path = createPathController(scene, characterParts.character, characterParts.body, ui.showStatus);
    let cameraFollowEnabled = false;
    const followPosition = new THREE.Vector3();
    const followTarget = new THREE.Vector3();
    const updateRoomColors = () => Object.values(roomMeshes).forEach(mesh => {
        const { floor, name, defaultMaterial } = mesh.userData;
        mesh.material = ui.isCurrentRoom(floor, name) ? materials.start : ui.isDestinationRoom(floor, name) ? materials.end : defaultMaterial;
        mesh.userData.baseOpacity = mesh.material.opacity;
    });
    ui.setRoomColorUpdater(updateRoomColors);
    ui.setSearchableRooms(roomMeshes, path.clearPath);
    ui.updateBadges();
    setupRoomInteraction({ camera, renderer, roomMeshes, ui, clearPath: path.clearPath, materials });
    ui.elements.currentButton.addEventListener('click', () => ui.setActiveTarget('current'));
    ui.elements.destinationButton.addEventListener('click', () => ui.setActiveTarget('destination'));
    ui.elements.goBtn.addEventListener('click', () => {
        if (path.isAnimating) {
            path.clearPath();
            ui.setNavigationLocked(false);
            ui.setNavigationActive(false);
            cameraFollowEnabled = false;
            return;
        }
        showRoute({ ui, graph, path });
        cameraFollowEnabled = path.isAnimating;
        ui.setNavigationActive(path.isAnimating);
        ui.setNavigationLocked(path.isAnimating);
    });

    controls.addEventListener('start', () => {
        if (!path.isAnimating || !cameraFollowEnabled) return;
        // A manual camera gesture takes control away from the automatic follow.
        cameraFollowEnabled = false;
    });

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        controls.update();
        path.update(delta, clock.elapsedTime);
        if (ui.navigationLocked && !path.isAnimating) {
            ui.setNavigationLocked(false);
            ui.setNavigationActive(false);
        }
        if (path.isAnimating) {
            if (cameraFollowEnabled) {
                const yaw = characterParts.character.rotation.y;
                const character = characterParts.character.position;
                followPosition.set(character.x - Math.sin(yaw) * 9, character.y + 5, character.z - Math.cos(yaw) * 9);
                followTarget.set(character.x, character.y + 0.75, character.z);
                const positionBlend = 1 - Math.exp(-delta * 3.5);
                const rotationBlend = 1 - Math.exp(-delta * 1.25);
                camera.position.lerp(followPosition, positionBlend);
                controls.target.lerp(followTarget, rotationBlend);
            }
        }
        if (characterParts.character.visible && path.isAnimating) {
            setFloorFocus(path.currentFloor, [ui.currentRoom?.key, ui.destinationRoom?.key].filter(Boolean));
        } else {
            setFloorFocus(null);
        }
        updateCameraRoomFocus(camera.position);
        sortLabelsByCamera();
        renderer.render(scene, camera);
    });
    window.addEventListener('resize', () => resizeRenderer(camera, renderer));
}

function showRoute({ ui, graph, path }) {
    if (!ui.currentRoom || !ui.destinationRoom) return;
    if (ui.currentRoom.key === ui.destinationRoom.key) return ui.showStatus('출발지와 도착지가 같습니다');
    const route = dijkstra(graph, ui.currentRoom.key, ui.destinationRoom.key);
    if (!route || route.length < 2) return ui.showStatus('경로를 찾을 수 없습니다');
    path.showPath(route);
    ui.showStatus(`Dijkstra · ${route.length}개 노드 · 이동 시작`, 2000);
}

function resizeRenderer(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
