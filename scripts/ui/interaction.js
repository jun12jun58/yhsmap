import * as THREE from 'three';

export function setupRoomInteraction({ camera, renderer, roomMeshes, ui, clearPath, materials }) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;
    let hoveredMaterial = null;
    let hoveredBaseOpacity = null;
    function updatePointer(event) {
        const bounds = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    }
    function restoreHovered() {
        if (!hovered) return;
        const mesh = hovered;
        const { floor, name } = mesh.userData;
        const isEndpoint = ui.isCurrentRoom(floor, name) || ui.isDestinationRoom(floor, name);
        mesh.material = getRoomMaterial(mesh);
        mesh.userData.baseOpacity = isEndpoint ? mesh.material.opacity : hoveredBaseOpacity;
        hoveredMaterial?.dispose();
        hovered = null;
        hoveredMaterial = null;
        hoveredBaseOpacity = null;
    }
    renderer.domElement.addEventListener('pointermove', event => {
        if (ui.navigationLocked) {
            restoreHovered();
            document.body.style.cursor = 'default';
            return;
        }
        updatePointer(event);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(Object.values(roomMeshes), false);
        const object = hits[0]?.object ?? null;
        if (hovered && (hovered !== object || isSelected(hovered))) restoreHovered();
        if (object) {
            if (!isSelected(object) && hovered !== object) {
                hovered = object;
                hoveredBaseOpacity = object.userData.baseOpacity;
                hoveredMaterial = materials.hover.clone();
                object.material = hoveredMaterial;
                object.userData.baseOpacity = hoveredMaterial.opacity;
            }
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    });
    renderer.domElement.addEventListener('click', event => {
        if (ui.navigationLocked) return;
        updatePointer(event);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(Object.values(roomMeshes), false);
        if (hits.length) ui.selectRoom(hits[0].object, clearPath);
    });
    function getRoomMaterial(mesh) {
        const { floor, name } = mesh.userData;
        if (ui.isCurrentRoom(floor, name)) return materials.start;
        if (ui.isDestinationRoom(floor, name)) return materials.end;
        return mesh.userData.defaultMaterial ?? materials.room;
    }
    function isSelected(mesh) {
        const { floor, name } = mesh.userData;
        return [ui.currentRoom, ui.destinationRoom].some(room => room && room.floor === floor && room.name === name);
    }
}
