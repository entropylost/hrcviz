const world = document.getElementById("world");
const worldCtx = world.getContext("2d");
const data = document.getElementById("data");
const dataCtx = data.getContext("2d");
const roundButton = document.getElementById("round");

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

const size = 32;
const spacing = 512 / size;

let pixel = [-1, -1];

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

function intersectAABB([sx, sy], [dx, dy], [ax, ay], [bx, by]) {
    let t0x = (ax - sx) / dx;
    let t1x = (bx - sx) / dx;
    let t0y = (ay - sy) / dy;
    let t1y = (by - sy) / dy;
    let tmin = Math.max(Math.min(t0x, t1x), Math.min(t0y, t1y));
    let tmax = Math.min(Math.max(t0x, t1x), Math.max(t0y, t1y));
    return [tmin, tmax];
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

function render() {
    dataCtx.clearRect(0, 0, 512, 512);
    dataCtx.fillStyle = "black";
    worldCtx.clearRect(0, 0, 512, 512);
    worldCtx.strokeStyle = "rgba(0, 0, 0, 0.1)";

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let start, dir;
            if (radioState.index === "lr") {
                start = [0, (i + 0.5) * spacing];
                dir = [512, (j - i) * spacing];
            } else if (radioState.index === "is") {
                start = [0, (i + 0.5) * spacing];
                dir = [512, (j - (size - 1) / 2) * spacing];
            } else if (radioState.index === "lb") {
                start = [0, (i + 0.5) * spacing];
                let end = [(j + 0.5) * spacing, 512];
                dir = [end[0] - start[0], end[1] - start[1]];
                // let start_side = i < size / 2;
                // let end_side = j < size / 2;
                // let a = ((i % (size / 2)) + 0.5) * spacing * 2;
                // let b = ((j % (size / 2)) + 0.5) * spacing * 2;
                // start = [start_side ? 0 : a, start_side ? a : 0];
                // let end = [end_side ? 512 : b, end_side ? b : 512];
                // dir = [end[0] - start[0], end[1] - start[1]];
            } else if (radioState.index === "rtheta") {
                let angle = ((i + 0.5) / size) * Math.PI * 2;
                let offset = ((j + 0.5) * spacing) / 2;
                dir = [1024 * Math.sin(angle), -1024 * Math.cos(angle)];
                start = [
                    offset * Math.cos(angle) - dir[0] / 2 + 256,
                    offset * Math.sin(angle) - dir[1] / 2 + 256,
                ];
            } else if (radioState.index === "ytheta") {
                let angle = ((j + 0.5) / size - 0.5) * Math.PI;
                start = [0, (i + 0.5) * spacing];
                dir = [1024 * Math.cos(angle), 1024 * Math.sin(angle)];
            } else if (radioState.index === "ringtheta") {
                let ringangle = ((i + 0.5) / size) * Math.PI * 2;
                let angle = ringangle + ((j + 0.5) / size - 0.5) * Math.PI;
                start = [
                    256 + 256 * Math.cos(ringangle),
                    256 + 256 * Math.sin(ringangle),
                ];
                dir = [-512 * Math.cos(angle), -512 * Math.sin(angle)];
            } else if (radioState.index === "ring2") {
                let ringangle1 = ((i + 0.5) / size) * Math.PI * 2;
                let ringangle2 = ((j + 0.5) / size) * Math.PI * 2;
                start = [
                    256 + 256 * Math.cos(ringangle1),
                    256 + 256 * Math.sin(ringangle1),
                ];
                let end = [
                    256 + 256 * Math.cos(ringangle2),
                    256 + 256 * Math.sin(ringangle2),
                ];
                dir = [end[0] - start[0], end[1] - start[1]];
            }
            let tmin, tmax;
            if (radioState.shape === "circle") {
                [tmin, tmax] = intersectCircle(
                    start,
                    dir,
                    [
                        pixel[0] * spacing + spacing / 2,
                        pixel[1] * spacing + spacing / 2,
                    ],
                    spacing / 2,
                );
            } else {
                [tmin, tmax] = intersectAABB(
                    start,
                    dir,
                    [pixel[0] * spacing, pixel[1] * spacing],
                    [(pixel[0] + 1) * spacing, (pixel[1] + 1) * spacing],
                );
            }
            if (pixel[0] == -1 || tmax > tmin) {
                let a = (tmax - tmin) * 4;
                if (pixel[0] == -1) {
                    a = 0.1;
                }

                worldCtx.strokeStyle = `rgba(0, 0, 0, ${a})`;
                worldCtx.beginPath();
                worldCtx.moveTo(start[0], start[1]);
                worldCtx.lineTo(start[0] + dir[0], start[1] + dir[1]);
                worldCtx.stroke();

                if (pixel[0] != -1) {
                    dataCtx.fillStyle = `rgba(0, 0, 0, ${a * 5})`;
                    dataCtx.fillRect(
                        i * spacing,
                        j * spacing,
                        spacing,
                        spacing,
                    );
                }
            }
        }
    }

    worldCtx.strokeStyle = "red";
    if (radioState.shape === "circle") {
        worldCtx.beginPath();
        worldCtx.arc(
            pixel[0] * spacing + spacing / 2,
            pixel[1] * spacing + spacing / 2,
            spacing / 2,
            0,
            2 * Math.PI,
        );
        worldCtx.stroke();
    } else {
        worldCtx.strokeRect(
            pixel[0] * spacing,
            pixel[1] * spacing,
            spacing,
            spacing,
        );
    }
}

function run() {
    render();
    requestAnimationFrame(run);
}
run();
