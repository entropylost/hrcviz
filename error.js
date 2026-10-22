const cascade_colors = [
    "blue",
    "green",
    "yellow",
    "cyan",
    "magenta",
    "orange",
    "purple",
    "pink",
    "brown",
];

const icefire = [
    [189, 231, 219],
    [167, 215, 213],
    [144, 200, 209],
    [120, 185, 206],
    [96, 171, 205],
    [76, 156, 205],
    [60, 140, 207],
    [55, 122, 208],
    [65, 103, 199],
    [73, 86, 179],
    [72, 73, 150],
    [65, 62, 119],
    [55, 53, 92],
    [45, 44, 69],
    [37, 37, 50],
    [32, 32, 37],
    [31, 30, 30],
    [39, 30, 31],
    [53, 32, 36],
    [70, 36, 43],
    [90, 40, 52],
    [112, 43, 60],
    [135, 45, 66],
    [159, 47, 68],
    [182, 52, 65],
    [201, 63, 58],
    [217, 80, 52],
    [229, 100, 51],
    [237, 123, 62],
    [242, 146, 85],
    [246, 168, 113],
    [251, 190, 143],
    [255, 212, 172],
];

function icefire_color(v) {
    const t = ((Math.min(Math.max(v, -1), 1) + 1) / 2) * (icefire.length - 1);
    const i = Math.min(Math.floor(t), icefire.length - 2);
    const f = t - i;
    const [r, g, b] = icefire[i].map((c, k) =>
        Math.round(c + (icefire[i + 1][k] - c) * f),
    );
    return `rgb(${r}, ${g}, ${b})`;
}

// could sometimes differ
function get_probe_spacing(cascade) {
    return Math.pow(2, cascade);
}
function get_probe_length({ cascade }) {
    return Math.pow(2, cascade);
}

function get_probe_transmission_ideal(probe, emitter) {
    const { position, cascade } = probe;
    const l = get_probe_length(probe);
    const dist = emitter - position;
    if (dist < l) {
        return { transmission: 0, excluded: true };
    }
    let { transmission, excluded } = get_probe_transmission_ideal(
        { position, cascade: cascade + 1 },
        emitter,
    );
    if (excluded) {
        transmission = 1 / dist;
    }
    return { transmission, excluded: false };
}

let use_half_probes = document.getElementById("mode").checked;
document.getElementById("mode").addEventListener("change", (e) => {
    use_half_probes = e.target.checked;
    draw();
});

let use_gradient = document.getElementById("gradient").checked;
document.getElementById("gradient").addEventListener("change", (e) => {
    use_gradient = e.target.checked;
    draw();
});

let output_scaling = parseFloat(document.getElementById("scaling").value);
document.getElementById("scaling").addEventListener("change", (e) => {
    output_scaling = parseFloat(e.target.value);
    draw();
});

function get_probes_around(position, cascade) {
    const l = get_probe_spacing(cascade);
    const offset = use_half_probes ? l / 2 : 0;
    const left = Math.floor((position - offset) / l) * l + offset;
    const right = left + l;
    const left_weight = 1 - (position - left) / l;
    const right_weight = 1 - left_weight;
    const probes = [];
    if (left_weight > 0) {
        probes.push({
            probe: { position: left, cascade },
            weight: left_weight,
        });
    }
    if (right_weight > 0) {
        probes.push({
            probe: { position: right, cascade },
            weight: right_weight,
        });
    }
    return probes;
}

function get_probe_transmission(probe, emitter, ctx) {
    const { position, cascade } = probe;
    const l = get_probe_length(probe);
    const dist = emitter - position;

    if (ctx) {
        ctx.fillStyle = cascade_colors[cascade % cascade_colors.length];
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.arc(position, cascade + 0.5, 0.3, 0, 2 * Math.PI);
        ctx.fill();
        if (dist < l) {
            ctx.stroke();
        }
    }

    if (dist < l) {
        return { transmission: null, excluded: true };
    }
    let transmission = {
        value: 0,
        gradient: 0,
    };
    let ideal = {
        value: 1 / dist,
        // gradient relative to probe position
        gradient: use_gradient ? 1 / (dist * dist) : 0,
    };
    for (const { probe, weight } of get_probes_around(position, cascade + 1)) {
        let { transmission: t, excluded } = get_probe_transmission(
            probe,
            emitter,
            ctx,
        );
        // Too early (this should be a finite range); so hit the tracing branch.
        if (excluded) {
            t = ideal;
        } else {
            // reproject transmission to the current probe's position
            t = {
                value: t.value + t.gradient * (position - probe.position),
                gradient: t.gradient,
            };
        }
        transmission.value += t.value * weight;
        transmission.gradient += t.gradient * weight;
    }
    return { transmission, excluded: false };
}

const canvas = document.getElementById("canvas");
const output = document.getElementById("output");

document.getElementById("canvas").addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaling = 32;
    const offset = use_half_probes ? 0.5 : 0;
    const cursor_pos = {
        x: Math.floor(x / scaling - offset),
        y: Math.floor(y / scaling),
    };
    draw(cursor_pos);
});

function draw(cursor_pos) {
    const ctx = canvas.getContext("2d");
    ctx.resetTransform();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaling = 32;
    ctx.setTransform(scaling, 0, 0, scaling, scaling / 2, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1, 1);
    ctx.lineWidth = 0.1;

    let total_error = 0;

    const offset = use_half_probes ? 0.5 : 0;
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const probe_pos = y + offset;
            const emitter_pos = probe_pos + x + 1;
            const transmission = get_probe_transmission(
                { position: probe_pos, cascade: 0 },
                emitter_pos,
            );
            const target = 1 / (emitter_pos - probe_pos);
            const error =
                (transmission.transmission.value * output_scaling - target) /
                target;
            total_error += Math.abs(error);
            ctx.fillStyle = icefire_color(error * 2);
            ctx.fillRect(x - 0.5 + offset, y, 1, 1);
        }
    }
    if (cursor_pos) {
        ctx.strokeStyle = "white";
        ctx.strokeRect(cursor_pos.x - 0.5 + offset, cursor_pos.y, 1, 1);
    }

    const average_error = total_error / (32 * 32);

    output.innerText = `Average error: ${average_error.toFixed(6)}`;

    if (cursor_pos) {
        const x = Math.floor(cursor_pos.x);
        const y = Math.floor(cursor_pos.y);
        const probe_pos = y + offset;
        const emitter_pos = probe_pos + x + 1;
        ctx.translate(32, 0);
        const transmission = get_probe_transmission(
            { position: probe_pos, cascade: 0 },
            emitter_pos,
            ctx,
        );
        const target = 1 / (emitter_pos - probe_pos);
        const error = (transmission.transmission.value - target) / target;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(emitter_pos, 0.5, 0.3, 0, 2 * Math.PI);
        ctx.fill();
        output.innerText += `
Probe selected at ${probe_pos}, emitter at ${emitter_pos}
Calculated transmission: ${transmission.transmission.value.toFixed(6)}
Transmission gradient: ${transmission.transmission.gradient.toFixed(6)}
Theoretical transmission: ${target.toFixed(6)}
Error: ${error.toFixed(6)}`;
    }
}

draw();
