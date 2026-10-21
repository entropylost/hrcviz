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

let use_half_probes = false;

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
        return { transmission: 0, excluded: true };
    }
    let transmission = 0;
    for (const { probe, weight } of get_probes_around(position, cascade + 1)) {
        let { transmission: t, excluded } = get_probe_transmission(
            probe,
            emitter,
            ctx,
        );
        // Too early (this should be a finite range); so hit the tracing branch.
        if (excluded) {
            t = 1 / dist;
        }
        transmission += t * weight;
    }
    return { transmission, excluded: false };
}

const canvas = document.getElementById("canvas");
const output = document.getElementById("output");

document.getElementById("mode").addEventListener("change", (e) => {
    use_half_probes = e.target.checked;
    draw();
});

document.getElementById("canvas").addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaling = 32;
    const cursor_pos = { x: x / scaling, y: y / scaling };
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

    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const offset = use_half_probes ? 0.5 : 0;
            const probe_pos = y + offset;
            const emitter_pos = probe_pos + x + 1;
            const transmission = get_probe_transmission(
                { position: probe_pos, cascade: 0 },
                emitter_pos,
            );
            const target = 1 / (emitter_pos - probe_pos);
            const error = Math.abs(transmission.transmission - target) / target;
            total_error += error;
            ctx.fillStyle = `rgba(255, 255, 255, ${error})`;
            ctx.fillRect(x - 0.5 + offset, y, 1, 1);
        }
    }
    const average_error = total_error / (32 * 32);

    output.innerText = `Average error: ${average_error.toFixed(6)}`;

    if (cursor_pos) {
        const x = Math.floor(cursor_pos.x);
        const y = Math.floor(cursor_pos.y);
        const offset = use_half_probes ? 0.5 : 0;
        const probe_pos = y + offset;
        const emitter_pos = probe_pos + x + 1;
        ctx.translate(32, 0);
        const transmission = get_probe_transmission(
            { position: probe_pos, cascade: 0 },
            emitter_pos,
            ctx,
        );
        const target = 1 / (emitter_pos - probe_pos);
        const error = Math.abs(transmission.transmission - target) / target;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(emitter_pos, 0.5, 0.3, 0, 2 * Math.PI);
        ctx.fill();
        output.innerText += `
Probe selected at ${probe_pos}, emitter at ${emitter_pos}
Calculated transmission: ${transmission.transmission}
Theoretical transmission: ${target}
Error: ${error}`;
    }
}

draw();
