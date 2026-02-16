const canvas = document.getElementById("main");

let cursor_pos = [0, 0];
let mouse_down = false;
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    cursor_pos = [e.clientX - rect.left, e.clientY - rect.top];
});
canvas.addEventListener("mousedown", (e) => {
    mouse_down = true;
});
canvas.addEventListener("mouseup", (e) => {
    mouse_down = false;
});

function wrapCanvas(ctx, unit, origin) {
    let tp = ([x, y]) => [x * unit + origin[0], y * unit + origin[1]];
    let tv = ([x, y]) => [x * unit, y * unit];
    let tv1 = (x) => x * unit;

    return {
        __proto__: ctx,
        get unit() {
            return unit;
        },
        get origin() {
            return origin;
        },
        get cursor_pos() {
            return [
                (cursor_pos[0] - origin[0]) / unit,
                (cursor_pos[1] - origin[1]) / unit,
            ];
        },
        polyline(points, stroke) {
            ctx.beginPath();
            ctx.moveTo(...tp(points[0]));
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(...tp(points[i]));
            }
            ctx.strokeStyle = stroke;
            ctx.stroke();
        },
        polygon(points, { stroke, fill }) {
            ctx.beginPath();
            ctx.moveTo(...tp(points[0]));
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(...tp(points[i]));
            }
            ctx.closePath();
            if (fill !== undefined) {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            if (stroke !== undefined) {
                ctx.strokeStyle = stroke;
                ctx.stroke();
            }
        },
        circle(pos, radius, { stroke, fill }) {
            ctx.beginPath();
            // use ellipse if there's a skew
            ctx.arc(tp(pos), tv1(radius), 0, 2 * Math.PI);
            if (fill !== undefined) {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            if (stroke !== undefined) {
                ctx.strokeStyle = stroke;
                ctx.stroke();
            }
        },
        rect(
            {
                center,
                size,
                half_size,
                top,
                left,
                bottom,
                right,
                width,
                height,
                lt,
                lb,
                rt,
                rb,
            },
            { stroke, fill },
        ) {
            if (size === undefined) {
                size = [width, height];
            }
            if (half_size !== undefined) {
                size = [half_size[0] * 2, half_size[1] * 2];
            }
            if (lt !== undefined) {
                left = lt[0];
                top = lt[1];
            }
            if (lb !== undefined) {
                left = lb[0];
                bottom = lb[1];
            }
            if (rt !== undefined) {
                right = rt[0];
                top = rt[1];
            }
            if (rb !== undefined) {
                right = rb[0];
                bottom = rb[1];
            }
            if (left !== undefined && right !== undefined) {
                size[0] = right - left;
            }
            if (top !== undefined && bottom !== undefined) {
                size[1] = bottom - top;
            }
            if (center !== undefined) {
                left = center[0] - size[0] / 2;
                top = center[1] - size[1] / 2;
            }
            if (left === undefined && right !== undefined) {
                left = right - size[0];
            }
            if (top === undefined && bottom !== undefined) {
                top = bottom - size[1];
            }
            if (size === undefined) {
                throw new Error("size cannot be computed");
            }
            if (left === undefined || top === undefined) {
                throw new Error("position cannot be computed");
            }
            let pos = [left, top];
            if (fill !== undefined) {
                ctx.fillStyle = fill;
                ctx.fillRect(...tp(pos), ...tv(size));
            }
            if (stroke !== undefined) {
                ctx.strokeStyle = stroke;
                ctx.strokeRect(...tp(pos), ...tv(size));
            }
        },
        clear() {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },
        shift(offset) {
            return wrapCanvas(ctx, unit, [
                origin[0] + offset[0] * unit,
                origin[1] + offset[1] * unit,
            ]);
        },
    };
}

function rgb(r, g, b, a = 1) {
    return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
}
function luma(l, a = 1) {
    return rgb(l, l, l, a);
}

const ctx = wrapCanvas(canvas.getContext("2d"), 20, [40, 40]);

// Note: For increased accuracy, could compute weights using an actual arc integral treating the target as a rect instead of a point.
// Or for even better accuracy, could use that for the start as well.
function transmissionWeight(probe, emitter) {
    let offset = [probe[0] - emitter[0], probe[1] - emitter[1]];
    let d = Math.hypot(offset[0], offset[1]);
    if (offset[0] === 0 && offset[1] === 0) {
        return 1;
    }
    return 1 / d;
}

let emitterPos = [6, 6];

function render() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clear();

    let displaySize = 16;

    function getBilinearProbes(pos, grid_size) {
        let x = Math.floor(pos[0] / grid_size) * grid_size;
        let y = Math.floor(pos[1] / grid_size) * grid_size;
        let x_frac = (pos[0] - x) / grid_size;
        let y_frac = (pos[1] - y) / grid_size;
        return [
            [[x, y], (1 - x_frac) * (1 - y_frac)],
            [[x + grid_size, y], x_frac * (1 - y_frac)],
            [[x, y + grid_size], (1 - x_frac) * y_frac],
            [[x + grid_size, y + grid_size], x_frac * y_frac],
        ];
    }

    /*
    let probePos = [3, 3];
    let bilinearProbes = getBilinearProbes(probePos, 4);

    ctx.rect({ center: probePos, size: [0.5, 0.5] }, { fill: "red" });
    for (let i = 0; i < bilinearProbes.length; i++) {
        ctx.rect(
            { center: bilinearProbes[i][0], size: [0.5, 0.5] },
            { fill: "blue" },
        );
    }

    for (let x = 0; x < displaySize; x++) {
        for (let y = 0; y < displaySize; y++) {
            if (Math.hypot(x - probePos[0], y - probePos[1]) > 1) {
                let transmission = bilinearProbes
                    .map(
                        ([pos, weight]) =>
                            weight * transmissionWeight(pos, [x, y]),
                    )
                    .reduce((a, b) => a + b, 0);
                let actualTransmission = transmissionWeight(probePos, [x, y]);
                let diff = Math.sqrt(
                    Math.abs(transmission - actualTransmission),
                );
                ctx.rect(
                    { center: [x, y], size: [diff, diff] },
                    { fill: "white" },
                );
            }
        }
    }
        */

    let previewSize = 32;
    let previewCtx = ctx.shift([40, 0]);

    if (mouse_down) {
        emitterPos = previewCtx.cursor_pos;
    }

    for (let x = 0; x < previewSize; x++) {
        for (let y = 0; y < previewSize; y++) {
            let transmission = transmissionWeight([x, y], emitterPos);
            previewCtx.rect(
                { center: [x, y], size: [1, 1] },
                { fill: luma(transmission) },
            );
        }
    }

    previewCtx = ctx.shift([0, 0]);
    for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
            let transmission = getBilinearProbes([x, y], 8)
                .map(
                    ([pos, weight]) =>
                        weight * transmissionWeight(pos, emitterPos),
                )
                .reduce((a, b) => a + b, 0);
            let actualTransmission = transmissionWeight([x, y], emitterPos);
            let diff = Math.sqrt(Math.abs(transmission - actualTransmission));
            previewCtx.rect(
                { center: [x, y], size: [1, 1] },
                { fill: luma(transmission) },
            );
        }
    }

    requestAnimationFrame(render);
}

render();
