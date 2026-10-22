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

function reproject_transmission(transmission, position, target) {
    const x = target - position;
    const gradient = transmission.gradient + transmission.curvature * x;
    const value =
        transmission.value +
        transmission.gradient * x +
        0.5 * transmission.curvature * x * x;
    return { value, gradient, curvature: transmission.curvature };
}
function get_transmission(dist, derivatives) {
    return {
        value: 1 / dist,
        gradient: derivatives >= 1 ? 1 / (dist * dist) : 0,
        curvature: derivatives >= 2 ? 2 / (dist * dist * dist) : 0,
    };
}

let use_half_probes = document.getElementById("mode").checked;
document.getElementById("mode").addEventListener("change", (e) => {
    use_half_probes = e.target.checked;
    draw();
});

let derivatives = document.getElementById("derivatives").value;
document.getElementById("derivatives").addEventListener("change", (e) => {
    derivatives = e.target.value;
    draw();
});

let output_scaling = parseFloat(document.getElementById("scaling").value);
document.getElementById("scaling").addEventListener("change", (e) => {
    output_scaling = parseFloat(e.target.value);
    draw();
});

let hist_min = parseFloat(document.getElementById("hist_min").value);
document.getElementById("hist_min").addEventListener("change", (e) => {
    hist_min = parseFloat(e.target.value);
    draw();
});

let hist_max = parseFloat(document.getElementById("hist_max").value);
document.getElementById("hist_max").addEventListener("change", (e) => {
    hist_max = parseFloat(e.target.value);
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
        curvature: 0,
    };
    for (const { probe, weight } of get_probes_around(position, cascade + 1)) {
        let { transmission: t, excluded } = get_probe_transmission(
            probe,
            emitter,
            ctx,
        );
        // Too early (this should be a finite range); so hit the tracing branch.
        if (excluded) {
            t = get_transmission(dist, derivatives);
        } else {
            // reproject transmission to the current probe's position
            t = reproject_transmission(t, probe.position, position);
        }
        transmission.value += t.value * weight;
        transmission.gradient += t.gradient * weight;
        transmission.curvature += t.curvature * weight;
    }
    return { transmission, excluded: false };
}

const canvas = document.getElementById("canvas");
const output = document.getElementById("output");
const histogram = document.getElementById("histogram");

let cursor_pos = null;

function handle_mouse_event(e) {
    if (e.buttons !== 1) {
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaling = 32;
    const offset = use_half_probes ? 0.5 : 0;
    cursor_pos = {
        x: Math.floor(x / scaling - offset),
        y: Math.floor(y / scaling),
    };
    draw();
}

canvas.addEventListener("mousedown", handle_mouse_event);
canvas.addEventListener("mousemove", handle_mouse_event);

function draw_histogram(errors) {
    const ctx = histogram.getContext("2d");
    const width = histogram.width;
    const height = histogram.height;
    const margin = 20;
    ctx.resetTransform();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    const bin_count = 64;
    const span = hist_max - hist_min;
    if (!(span > 0)) {
        return;
    }
    const bins = new Array(bin_count).fill(0);
    let out_of_range = 0;
    for (const error of errors) {
        const t = (error - hist_min) / span;
        if (t < 0 || t > 1) {
            out_of_range++;
            continue;
        }
        bins[Math.min(Math.floor(t * bin_count), bin_count - 1)]++;
    }
    const max_count = Math.max(...bins, 1);

    const plot_height = height - 2 * margin;
    const bin_width = width / bin_count;
    for (let i = 0; i < bin_count; i++) {
        const center = hist_min + ((i + 0.5) / bin_count) * span;
        const bar_height = (bins[i] / max_count) * plot_height;
        ctx.fillStyle = icefire_color(center * 2);
        // Bars hang down from the axis at the top.
        ctx.fillRect(i * bin_width, margin, bin_width - 1, bar_height);
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, margin - 0.5);
    ctx.lineTo(width, margin - 0.5);
    if (hist_min < 0 && hist_max > 0) {
        const zero_x = (-hist_min / span) * width;
        ctx.moveTo(zero_x, margin);
        ctx.lineTo(zero_x, height - margin);
    }
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillText(`${hist_min}`, 2, margin - 4);
    if (hist_min < 0 && hist_max > 0) {
        ctx.textAlign = "center";
        ctx.fillText("0", (-hist_min / span) * width, margin - 4);
    }
    ctx.textAlign = "right";
    ctx.fillText(`${hist_max}`, width - 2, margin - 4);
    ctx.fillText(
        `max count: ${max_count}, out of range: ${out_of_range}`,
        width - 2,
        height - 4,
    );
}

function draw() {
    const ctx = canvas.getContext("2d");
    ctx.resetTransform();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaling = 32;
    ctx.setTransform(scaling, 0, 0, scaling, scaling / 2, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1, 1);
    ctx.lineWidth = 0.1;

    let errors = [];

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
            errors.push(error);
            ctx.fillStyle = icefire_color(error * 2);
            ctx.fillRect(x - 0.5 + offset, y, 1, 1);
        }
    }
    if (cursor_pos) {
        ctx.strokeStyle = "white";
        ctx.strokeRect(cursor_pos.x - 0.5 + offset, cursor_pos.y, 1, 1);
    }

    draw_histogram(errors);

    const max_negative_error = Math.min(...errors);
    const max_positive_error = Math.max(...errors);
    const abs_errors = errors.map(Math.abs).sort((a, b) => a - b);
    const mid = abs_errors.length / 2;
    const median_abs_error =
        abs_errors.length % 2 === 0
            ? (abs_errors[mid - 1] + abs_errors[mid]) / 2
            : abs_errors[Math.floor(mid)];
    const mean_abs_error =
        abs_errors.reduce((a, b) => a + b, 0) / abs_errors.length;

    output.innerText = `Max negative error: ${max_negative_error.toFixed(6)}
Max positive error: ${max_positive_error.toFixed(6)}
Median absolute error: ${median_abs_error.toFixed(6)}
Mean absolute error: ${mean_abs_error.toFixed(6)}`;

    if (cursor_pos) {
        if (cursor_pos.x < 32) {
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
        } else {
            const emitter_pos_x = cursor_pos.x - 32 + offset;
            const emitter_pos_y = cursor_pos.y + offset;

            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    const probe_pos_x = x + offset;
                    const probe_pos_y = y + offset;
                    const dist = Math.sqrt(
                        (emitter_pos_x - probe_pos_x) ** 2 +
                            (emitter_pos_y - probe_pos_y) ** 2,
                    );
                    const facing =
                        Math.abs(emitter_pos_x - probe_pos_x) >
                        Math.abs(emitter_pos_y - probe_pos_y);
                    const probe_pos = facing ? probe_pos_x : probe_pos_y;
                    const transmission = get_probe_transmission(
                        { position: probe_pos, cascade: 0 },
                        probe_pos + dist,
                    );
                    if (transmission.excluded) {
                        continue;
                    }
                    ctx.fillStyle = `rgba(255, 255, 255, ${transmission.transmission.value})`;
                    ctx.fillRect(
                        probe_pos_x + 32 - 0.5,
                        probe_pos_y - offset,
                        1,
                        1,
                    );
                }
            }
        }
    }
}

draw();
