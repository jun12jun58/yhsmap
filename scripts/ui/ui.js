export function createUI() {
    const elements = {
        currentResult: document.getElementById('currentResult'), destinationResult: document.getElementById('destinationResult'),
        currentButton: document.getElementById('currentButton'), destinationButton: document.getElementById('destinationButton'),
        goBtn: document.getElementById('goBtn'),
        clearCurrentResult: document.getElementById('clearCurrentResult'),
        clearDestinationResult: document.getElementById('clearDestinationResult'),
        status: document.getElementById('status')
    };
    let activeTarget = 'current';
    let currentRoom = null;
    let destinationRoom = null;
    let navigationLocked = false;
    let navigationActive = false;
    let roomColorUpdater = () => { };
    let searchableRooms = [];
    let statusTimer;
    function updateBadges(updateRoomColors = roomColorUpdater) {
        elements.currentResult.value = currentRoom ? `${currentRoom.floor}층 ${currentRoom.name}` : '';
        elements.currentResult.classList.toggle('start', Boolean(currentRoom));
        elements.clearCurrentResult.hidden = !currentRoom;
        elements.destinationResult.value = destinationRoom ? `${destinationRoom.floor}층 ${destinationRoom.name}` : '';
        elements.destinationResult.classList.toggle('end', Boolean(destinationRoom));
        elements.clearDestinationResult.hidden = !destinationRoom;
        elements.goBtn.disabled = !navigationActive && !(currentRoom && destinationRoom);
        updateRoomColors();
    }
    function showStatus(message, duration = 2000) {
        elements.status.textContent = message;
        elements.status.style.display = 'block';
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => { elements.status.style.display = 'none'; }, duration);
    }
    function setActiveTarget(target) {
        if (navigationLocked) return;
        activeTarget = target;
        elements.currentButton.classList.toggle('active', target === 'current');
        elements.destinationButton.classList.toggle('active', target === 'destination');
        elements.currentButton.setAttribute('aria-pressed', String(target === 'current'));
        elements.destinationButton.setAttribute('aria-pressed', String(target === 'destination'));
    }
    function selectRoom(mesh, clearPath) {
        if (navigationLocked || !mesh?.userData?.isRoom) return;
        const { floor, name } = mesh.userData;
        const room = { floor, name, key: `${floor}|${name}` };
        if (activeTarget === 'current') currentRoom = room; else destinationRoom = room;
        updateBadges();
        clearPath();
    }
    function setSearchableRooms(roomMeshes, clearPath) {
        searchableRooms = Object.values(roomMeshes).map(mesh => ({
            floor: mesh.userData.floor,
            name: mesh.userData.name,
            key: mesh.userData.roomKey
        }));
        const normalize = value => value.replace(/\s+/g, '').toLocaleLowerCase();
        const suggestionLists = new Map();
        const clearSelection = target => {
            if (target === 'current') currentRoom = null;
            else destinationRoom = null;
            suggestionLists.get(target === 'current' ? elements.currentResult : elements.destinationResult)?.element.remove();
            updateBadges();
            clearPath();
        };
        elements.clearCurrentResult.addEventListener('click', () => clearSelection('current'));
        elements.clearDestinationResult.addEventListener('click', () => clearSelection('destination'));
        const commitRoom = (target, input, room) => {
            if (target === 'current') currentRoom = room;
            else destinationRoom = room;
            updateBadges();
            clearPath();
            suggestionLists.get(input)?.element.remove();
        };
        const showSuggestions = (target, input) => {
            const query = normalize(input.value.trim());
            const suggestions = suggestionLists.get(input);
            suggestions.element.replaceChildren();
            if (!query) {
                suggestions.element.remove();
                return;
            }
            const matches = searchableRooms.filter(room =>
                normalize(room.name).includes(query)
                || normalize(`${room.floor}층 ${room.name}`).includes(query)
            ).slice(0, 8);
            if (!matches.length) {
                suggestions.element.remove();
                return;
            }
            const rect = input.getBoundingClientRect();
            suggestions.element.style.left = `${rect.left}px`;
            suggestions.element.style.top = `${rect.bottom + 4}px`;
            suggestions.element.style.width = `${rect.width}px`;
            matches.forEach(room => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'room-suggestion';
                option.textContent = `${room.floor}층 ${room.name}`;
                option.addEventListener('pointerdown', event => {
                    event.preventDefault();
                    commitRoom(target, input, room);
                });
                suggestions.element.appendChild(option);
            });
            document.body.appendChild(suggestions.element);
        };
        const setupSearch = (target, input) => {
            const list = document.createElement('div');
            list.className = 'room-suggestions';
            suggestionLists.set(input, { element: list });
            input.addEventListener('input', () => showSuggestions(target, input));
            input.addEventListener('focus', () => showSuggestions(target, input));
            input.addEventListener('blur', () => setTimeout(() => list.remove(), 120));
            input.addEventListener('keydown', event => {
                if (event.key === 'Escape') list.remove();
                if (event.key === 'Enter' && list.firstElementChild) {
                    event.preventDefault();
                    list.firstElementChild.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                }
            });
        };
        setupSearch('current', elements.currentResult);
        setupSearch('destination', elements.destinationResult);
    }
    function reset() {
        currentRoom = null;
        destinationRoom = null;
        updateBadges();
    }
    function setNavigationLocked(locked) {
        navigationLocked = Boolean(locked);
        elements.currentButton.disabled = navigationLocked;
        elements.destinationButton.disabled = navigationLocked;
        elements.currentResult.disabled = navigationLocked;
        elements.destinationResult.disabled = navigationLocked;
        elements.clearCurrentResult.disabled = navigationLocked;
        elements.clearDestinationResult.disabled = navigationLocked;
        elements.goBtn.disabled = !navigationActive && !(currentRoom && destinationRoom);
    }
    function setNavigationActive(active) {
        navigationActive = Boolean(active);
        elements.goBtn.textContent = navigationActive ? '안내 종료' : '경로 안내';
        elements.goBtn.setAttribute('aria-pressed', String(navigationActive));
        elements.goBtn.disabled = !navigationActive && !(currentRoom && destinationRoom);
    }
    function setRoomColorUpdater(updater) {
        roomColorUpdater = updater;
    }
    function isCurrentRoom(floor, name) { return currentRoom?.floor === floor && currentRoom?.name === name; }
    function isDestinationRoom(floor, name) { return destinationRoom?.floor === floor && destinationRoom?.name === name; }
    return { elements, get currentRoom() { return currentRoom; }, get destinationRoom() { return destinationRoom; }, get activeTarget() { return activeTarget; }, get navigationLocked() { return navigationLocked; }, updateBadges, showStatus, setActiveTarget, setNavigationLocked, setNavigationActive, selectRoom, setSearchableRooms, reset, setRoomColorUpdater, isCurrentRoom, isDestinationRoom };
}
