import * as THREE from 'three';

function makeMesh(geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
}

export function createCharacter(scene) {
    const character = new THREE.Group();
    character.scale.setScalar(1.15);

    const skin = new THREE.MeshStandardMaterial({ color: 0xffcfa3, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xea4335, roughness: 0.5, metalness: 0.1 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1d23 });

    // 몸통과 얼굴
    const body = new THREE.Group();
    character.add(body);

    const torso = makeMesh(new THREE.CapsuleGeometry(0.16, 0.62, 4, 10), shirt);
    torso.position.y = 0.47;
    torso.scale.z = 0.8;
    body.add(torso);

    const head = makeMesh(new THREE.SphereGeometry(0.19, 20, 18), skin);
    head.position.y = 1.05;
    body.add(head);

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), eyeMat);
    eyeLeft.position.set(-0.068, 1.045, 0.17);
    body.add(eyeLeft);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.x = 0.068;
    body.add(eyeRight);

    character.visible = false;
    scene.add(character);
    return { character, body };
}

export function createPathController(scene, character, body, showStatus) {
    let pathLine = null;
    let pathPoints = [];
    let animating = false;
    let animIndex = 0;
    let animT = 0;
    const speed = 3.2;
    const turnRate = 2.4;
    const fromVector = new THREE.Vector3();
    const toVector = new THREE.Vector3();

    function clearPath() {
        if (pathLine) {
            scene.remove(pathLine);
            pathLine.traverse(child => { if (child.geometry) child.geometry.dispose(); if (child.material) child.material.dispose(); });
            pathLine = null;
        }
        pathPoints = [];
        animating = false;
        character.visible = false;
    }

    function showPath(points) {
        clearPath();
        if (!points || points.length < 2) return;
        pathPoints = points;
        const positions = [];
        points.forEach(point => positions.push(point.x, point.y + 0.18, point.z));
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        pathLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x34a853, transparent: true, opacity: 0.95 }));
        scene.add(pathLine);
        points.slice(1, -1).forEach(point => {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0x34a853 }));
            dot.position.set(point.x, point.y + 0.18, point.z);
            pathLine.add(dot);
        });
        const start = points[0];
        character.position.set(start.x, start.y, start.z);
        character.visible = true;
        animIndex = 0;
        animT = 0;
        animating = true;
    }

    function update(dt, elapsedTime) {
        if (animating && pathPoints.length >= 2) {
            const from = pathPoints[animIndex];
            const to = pathPoints[animIndex + 1];
            if (!to) { animating = false; showStatus('도착했습니다!', 2000); }
            else {
                const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
                animT += (speed * dt) / Math.max(distance, 0.01);
                if (animT >= 1) {
                    animT = 0;
                    animIndex++;
                    if (animIndex >= pathPoints.length - 1) {
                        character.position.set(to.x, to.y, to.z);
                        animating = false;
                        showStatus('도착했습니다!', 2000);
                    }
                } else {
                    fromVector.set(from.x, from.y, from.z);
                    toVector.set(to.x, to.y, to.z);
                    character.position.lerpVectors(fromVector, toVector, animT);
                    const direction = new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
                    if (direction.lengthSq() > 0.001) {
                        const targetYaw = Math.atan2(direction.x, direction.z);
                        const angleDifference = THREE.MathUtils.euclideanModulo(
                            targetYaw - character.rotation.y + Math.PI,
                            Math.PI * 2
                        ) - Math.PI;
                        character.rotation.y += angleDifference * (1 - Math.exp(-turnRate * dt));
                    }
                }
            }
        }

    }
    function getCurrentFloor() {
        const from = pathPoints[animIndex];
        if (!from) return null;
        const to = pathPoints[animIndex + 1];
        return to && animT >= 0.5 ? to.floor : from.floor;
    }
    return { clearPath, showPath, update, get isAnimating() { return animating; }, get currentFloor() { return getCurrentFloor(); } };
}
