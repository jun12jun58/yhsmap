export function dijkstra(graph, startKey, endKey) {
    const { nodes, adjacency } = graph;
    if (!nodes[startKey] || !nodes[endKey]) return null;
    const distances = {};
    const previous = {};
    const visited = new Set();
    const queue = new MinPriorityQueue();
    Object.keys(nodes).forEach(id => { distances[id] = Infinity; });
    distances[startKey] = 0;
    queue.push(0, startKey);
    while (queue.size) {
        const [distance, current] = queue.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        if (current === endKey) break;
        for (const neighbor of adjacency[current] || []) {
            const nextDistance = distance + neighbor.cost;
            if (nextDistance < distances[neighbor.to]) {
                distances[neighbor.to] = nextDistance;
                previous[neighbor.to] = current;
                queue.push(nextDistance, neighbor.to);
            }
        }
    }
    if (distances[endKey] === Infinity) return null;
    const path = [];
    let current = endKey;
    while (current) { path.unshift(nodes[current]); current = previous[current]; }
    return path;
}

class MinPriorityQueue {
    #items = [];

    get size() { return this.#items.length; }

    push(priority, value) {
        const item = [priority, value];
        this.#items.push(item);
        let index = this.#items.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.#items[parent][0] <= priority) break;
            this.#items[index] = this.#items[parent];
            index = parent;
        }
        this.#items[index] = item;
    }

    pop() {
        const first = this.#items[0];
        const last = this.#items.pop();
        if (!this.#items.length) return first;
        let index = 0;
        while (index * 2 + 1 < this.#items.length) {
            let child = index * 2 + 1;
            if (child + 1 < this.#items.length && this.#items[child + 1][0] < this.#items[child][0]) child++;
            if (this.#items[child][0] >= last[0]) break;
            this.#items[index] = this.#items[child];
            index = child;
        }
        this.#items[index] = last;
        return first;
    }
}
