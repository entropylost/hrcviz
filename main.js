const world = document.getElementById("world");
const worldCtx = world.getContext("2d");
const data = document.getElementById("data");
const dataCtx = data.getContext("2d");
const circleButton = document.getElementById("circle");

const size = 32;
const spacing = 512 / size;

const lightPos = [1024, 256];
const lightRadius = 16;
// const lightColor =

let pixel = [-1, -1];

world.addEventListener("mousemove", (e) => {
    const rect = world.getBoundingClientRect();
    pixel[0] = Math.floor((e.clientX - rect.left) / spacing);
    pixel[1] = Math.floor((e.clientY - rect.top) / spacing);
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

    let isCircle = circleButton.checked;

    for (let x = 0.5; x < size; x++) {
        for (let y = 0.5; y < size; y++) {
            let tmin, tmax;
            if (isCircle) {
                [tmin, tmax] = intersectCircle(
                    [0, x * spacing],
                    [512, y * spacing - x * spacing],
                    [
                        pixel[0] * spacing + spacing / 2,
                        pixel[1] * spacing + spacing / 2,
                    ],
                    spacing / 2,
                );
            } else {
                [tmin, tmax] = intersectAABB(
                    [0, x * spacing],
                    [512, y * spacing - x * spacing],
                    [pixel[0] * spacing, pixel[1] * spacing],
                    [(pixel[0] + 1) * spacing, (pixel[1] + 1) * spacing],
                );
            }
            if (pixel[0] == -1 || tmax > tmin) {
                worldCtx.beginPath();
                worldCtx.moveTo(0, x * spacing);
                worldCtx.lineTo(512, y * spacing);
                worldCtx.stroke();

                if (pixel[0] != -1) {
                    let a = (tmax - tmin) * 20;
                    console.log(a);
                    dataCtx.fillStyle = `rgba(0, 0, 0, ${a})`;
                    dataCtx.fillRect(
                        (x - 0.5) * spacing,
                        (y - 0.5) * spacing,
                        spacing,
                        spacing,
                    );
                }
            }
        }
    }

    worldCtx.strokeStyle = "red";
    if (isCircle) {
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
