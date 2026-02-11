const world = document.getElementById("world");
const worldCtx = world.getContext("2d");
const data = document.getElementById("data");
const dataCtx = data.getContext("2d");
const roundButton = document.getElementById("round");
const linesButton = document.getElementById("lines");

const radioState = {};

document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    if (radio.checked) {
        radioState[radio.name] = radio.value;
    }
    radio.addEventListener("change", () => {
        if (radio.checked) {
            radioState[radio.name] = radio.value;
        }
    });
});

const size = 16;
const spacing = 512 / size;

let basisElements = [
    {
        points: [
            [4, 4],
            [4, 5],
            [5, 4],
            [5, 5],
        ],
        color: [0, 0, 0],
    },
    {
        points: [
            [4, 4],
            [4, 5],
            [6, 4],
            [6, 5],
        ],
        color: [255, 0, 0],
    },
];

function colorToString(color, alpha) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

document.getElementById("clear").addEventListener("click", () => {
    basisElements = [];
    requestAnimationFrame(render);
});

function newEmptyBasis() {
    return {
        points: [],
        color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
    };
}

let nextBasisElement = newEmptyBasis();

world.addEventListener("click", (e) => {
    const rect = world.getBoundingClientRect();
    let pos;
    if (roundButton.checked) {
        pos = [
            Math.round((e.clientX - rect.left) / spacing),
            Math.round((e.clientY - rect.top) / spacing),
        ];
    } else {
        pos = [
            (e.clientX - rect.left) / spacing,
            (e.clientY - rect.top) / spacing,
        ];
    }
    nextBasisElement.points.push(pos);
    if (nextBasisElement.points.length === 4) {
        let [t, u] = intersectLine(
            nextBasisElement.points[0],
            nextBasisElement.points[2],
            nextBasisElement.points[1],
            nextBasisElement.points[3],
        );
        if (t != Infinity && 0 <= u && u <= 1 && 0 <= t && t <= 1) {
            console.log("Overlapping basis element. Flipping.");
            let temp = nextBasisElement.points[2];
            nextBasisElement.points[2] = nextBasisElement.points[3];
            nextBasisElement.points[3] = temp;
        }
        basisElements.push(nextBasisElement);
        nextBasisElement = newEmptyBasis();
    }
    requestAnimationFrame(render);
});

roundButton.addEventListener("change", () => {
    requestAnimationFrame(render);
});
linesButton.addEventListener("change", () => {
    requestAnimationFrame(render);
});

/*
world.addEventListener("mousemove", (e) => {
    const rect = world.getBoundingClientRect();
    if (roundButton.checked) {
        pixel[0] = Math.floor((e.clientX - rect.left) / spacing);
        pixel[1] = Math.floor((e.clientY - rect.top) / spacing);
    } else {
        pixel[0] = (e.clientX - rect.left) / spacing - 0.5;
        pixel[1] = (e.clientY - rect.top) / spacing - 0.5;
    }
});
world.addEventListener("mouseleave", () => {
    pixel = [-1, -1];
});
*/

function intersectAABB([sx, sy], [dx, dy], [ax, ay], [bx, by]) {
    let t0x = (ax - sx) / dx;
    let t1x = (bx - sx) / dx;
    let t0y = (ay - sy) / dy;
    let t1y = (by - sy) / dy;
    let tmin = Math.max(Math.min(t0x, t1x), Math.min(t0y, t1y));
    let tmax = Math.min(Math.max(t0x, t1x), Math.max(t0y, t1y));
    return [tmin, tmax];
}

function lerp([ax, ay], [bx, by], t) {
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

// llm code, rewrite if wrong
function intersectLine([sx, sy], [tx, ty], [ax, ay], [bx, by]) {
    let dx = tx - sx;
    let dy = ty - sy;
    let ex = bx - ax;
    let ey = by - ay;
    let det = ex * dy - ey * dx;
    if (Math.abs(det) < 1e-12) return [Infinity, Infinity];
    let t = (ex * (ay - sy) - ey * (ax - sx)) / det;
    let u = (dx * (ay - sy) - dy * (ax - sx)) / det;
    return [t, u];
}

// llm code, rewrite if wrong
function intersectCircle([sx, sy], [dx, dy], [cx, cy], r) {
    let ocx = sx - cx;
    let ocy = sy - cy;
    let a = dx * dx + dy * dy;
    let b = 2 * (ocx * dx + ocy * dy);
    let c = ocx * ocx + ocy * ocy - r * r;
    let disc = b * b - 4 * a * c;
    if (disc < 0) return [Infinity, -Infinity];
    let sqrtDisc = Math.sqrt(disc);
    let tmin = (-b - sqrtDisc) / (2 * a);
    let tmax = (-b + sqrtDisc) / (2 * a);
    return [tmin, tmax];
}

function plotLine(a, b) {
    let slope = (b[1] - a[1]) / (b[0] - a[0]);
    let intercept = a[1] - slope * a[0];
    dataCtx.beginPath();
    dataCtx.arc(slope * 256 + 256, intercept * spacing, 3, 0, 2 * Math.PI);
    dataCtx.fill();
}

function render() {
    dataCtx.clearRect(0, 0, 512, 512);
    worldCtx.clearRect(0, 0, 512, 512);

    worldCtx.fillStyle = "rgba(0, 0, 0, 0.1)";

    if (roundButton.checked) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                worldCtx.beginPath();
                worldCtx.arc(i * spacing, j * spacing, 2, 0, 2 * Math.PI);
                worldCtx.fill();
            }
        }
    }

    worldCtx.fillStyle = colorToString(nextBasisElement.color, 0.5);
    for (const point of nextBasisElement.points) {
        worldCtx.beginPath();
        worldCtx.arc(point[0] * spacing, point[1] * spacing, 5, 0, 2 * Math.PI);
        worldCtx.fill();
    }

    for (const {
        points: [a, b, c, d],
        color,
    } of basisElements) {
        worldCtx.strokeStyle = colorToString(color, 0.01);
        dataCtx.fillStyle = colorToString(color, 0.01);
        for (let t1 = 0; t1 <= 1.0001; t1 += 0.01) {
            for (let t2 = 0; t2 <= 1.0001; t2 += 0.01) {
                let p1 = lerp(a, b, t1);
                let p2 = lerp(c, d, t2);
                if (linesButton.checked) {
                    let pa = lerp(p1, p2, -20.0);
                    let pb = lerp(p1, p2, 21.0);
                    worldCtx.beginPath();
                    worldCtx.moveTo(pa[0] * spacing, pa[1] * spacing);
                    worldCtx.lineTo(pb[0] * spacing, pb[1] * spacing);
                    worldCtx.stroke();
                }

                plotLine(p1, p2);
            }
        }

        if (!linesButton.checked) {
            worldCtx.strokeStyle = colorToString(color, 1.0);
            worldCtx.fillStyle = colorToString(color, 0.1);

            let am = lerp(a, d, -20.0);
            let bm = lerp(b, c, 21.0);
            let cm = lerp(b, c, -20.0);
            let dm = lerp(a, d, 21.0);
            worldCtx.beginPath();
            worldCtx.moveTo(am[0] * spacing, am[1] * spacing);
            worldCtx.lineTo(a[0] * spacing, a[1] * spacing);
            worldCtx.lineTo(c[0] * spacing, c[1] * spacing);
            worldCtx.lineTo(bm[0] * spacing, bm[1] * spacing);
            worldCtx.lineTo(dm[0] * spacing, dm[1] * spacing);
            worldCtx.lineTo(d[0] * spacing, d[1] * spacing);
            worldCtx.lineTo(b[0] * spacing, b[1] * spacing);
            worldCtx.lineTo(cm[0] * spacing, cm[1] * spacing);
            worldCtx.closePath();
            worldCtx.stroke();
            worldCtx.fill();
        }
    }
}

requestAnimationFrame(render);
