(() => {
    const canvas = document.getElementById('boids-canvas');
    const ctx = canvas.getContext('2d');

    const NUM_BOIDS = 60;
    const CRUISE_SPEED = 1.2;
    const VISUAL_RANGE = 160;
    const SEPARATION_DIST = 35;
    const EDGE_MARGIN = 120;

    // How fast a boid can turn toward its desired heading (0–1).
    // Lower = more inertia, smoother arcs.
    const TURN_RATE = 0.03;

    const MOUSE_RANGE = 150;
    const MOUSE_STRENGTH = 2;
    const TEXT_PADDING = 20;
    const TEXT_MARGIN = 140;
    const TEXT_PUSH = 0.003;
    const TEXT_SHOVE = 0.04;
    const TEXT_SHOVE_DIST = 25;

    let W, H;
    let mouseX = -9999, mouseY = -9999;
    const boids = [];
    let textBoxes = [];

    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
        updateTextBoxes();
    }

    function updateTextBoxes() {
        const splashRect = canvas.getBoundingClientRect();
        textBoxes = [];
        for (const el of document.querySelectorAll('[data-boid-avoid]')) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const rects = range.getClientRects();
            for (const r of rects) {
                textBoxes.push({
                    x: r.left - splashRect.left - TEXT_PADDING,
                    y: r.top - splashRect.top - TEXT_PADDING,
                    w: r.width + TEXT_PADDING * 2,
                    h: r.height + TEXT_PADDING * 2,
                });
            }
        }
    }

    // Minimal chevron bird — just a ^ shape
    const FRAMES = [
        // Wings up
        [
            [0, 1, 0, 0, 0, 1, 0],
            [0, 0, 1, 0, 1, 0, 0],
            [0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        // Wings mid
        [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 0, 1, 1, 0],
            [0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        // Wings down
        [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0],
            [0, 0, 1, 0, 1, 0, 0],
            [0, 1, 0, 0, 0, 1, 0],
        ],
    ];

    const FRAME_SEQ = [0, 1, 2, 1];
    const FLAP_SPEED = 0.04;
    const PX = 2;

    const spriteCache = FRAME_SEQ.map(() => ({ normal: null }));

    function buildSprites() {
        for (let f = 0; f < FRAME_SEQ.length; f++) {
            const grid = FRAMES[FRAME_SEQ[f]];
            const w = grid[0].length * PX;
            const h = grid.length * PX;

            const nc = document.createElement('canvas');
            nc.width = w;
            nc.height = h;
            const nctx = nc.getContext('2d');
            nctx.fillStyle = 'rgba(10, 10, 10, 0.6)';
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c]) nctx.fillRect(c * PX, r * PX, PX, PX);
                }
            }
            spriteCache[f].normal = nc;
        }
    }

    function init() {
        resize();
        buildSprites();
        for (let i = 0; i < NUM_BOIDS; i++) {
            const angle = Math.random() * Math.PI * 2;
            boids.push({
                x: W * 0.5 + (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * CRUISE_SPEED,
                vy: Math.abs(Math.sin(angle)) * CRUISE_SPEED,
                flapPhase: Math.random(),
            });
        }
    }

    function update() {
        for (const b of boids) {
            let desVx = 0, desVy = 0;
            let cohX = 0, cohY = 0, cohN = 0;
            let aliVx = 0, aliVy = 0, aliN = 0;
            let sepX = 0, sepY = 0;

            for (const other of boids) {
                if (other === b) continue;
                const dx = other.x - b.x;
                const dy = other.y - b.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < VISUAL_RANGE * VISUAL_RANGE) {
                    const dist = Math.sqrt(distSq);

                    cohX += other.x;
                    cohY += other.y;
                    cohN++;

                    aliVx += other.vx;
                    aliVy += other.vy;
                    aliN++;

                    if (dist < SEPARATION_DIST) {
                        const urgency = 1 - dist / SEPARATION_DIST;
                        sepX -= (dx / dist) * urgency;
                        sepY -= (dy / dist) * urgency;
                    }
                }
            }

            desVx = b.vx;
            desVy = b.vy;

            if (cohN > 0) {
                const cx = cohX / cohN, cy = cohY / cohN;
                desVx += (cx - b.x) * 0.003;
                desVy += (cy - b.y) * 0.003;
            }

            if (aliN > 0) {
                desVx += (aliVx / aliN) * 0.15;
                desVy += (aliVy / aliN) * 0.15;
            }

            desVx += sepX * 0.6;
            desVy += sepY * 0.6;

            if (b.x < EDGE_MARGIN) desVx += (EDGE_MARGIN - b.x) * 0.003;
            if (b.x > W - EDGE_MARGIN) desVx -= (b.x - (W - EDGE_MARGIN)) * 0.003;
            if (b.y < EDGE_MARGIN) desVy += (EDGE_MARGIN - b.y) * 0.003;
            if (b.y > H - EDGE_MARGIN) desVy -= (b.y - (H - EDGE_MARGIN)) * 0.003;

            const mdx = b.x - mouseX;
            const mdy = b.y - mouseY;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < MOUSE_RANGE && mDist > 0) {
                const urgency = 1 - mDist / MOUSE_RANGE;
                desVx += (mdx / mDist) * urgency * MOUSE_STRENGTH;
                desVy += (mdy / mDist) * urgency * MOUSE_STRENGTH;
            }

            for (const box of textBoxes) {
                const cx = Math.max(box.x, Math.min(b.x, box.x + box.w));
                const cy = Math.max(box.y, Math.min(b.y, box.y + box.h));
                const tdx = b.x - cx;
                const tdy = b.y - cy;
                const tDist = Math.sqrt(tdx * tdx + tdy * tdy);

                if (tDist < TEXT_MARGIN) {
                    const depth = TEXT_MARGIN - tDist;
                    if (tDist > 0) {
                        desVx += (tdx / tDist) * depth * TEXT_PUSH;
                        desVy += (tdy / tDist) * depth * TEXT_PUSH;
                        if (tDist < TEXT_SHOVE_DIST) {
                            const shoveDepth = TEXT_SHOVE_DIST - tDist;
                            desVx += (tdx / tDist) * shoveDepth * TEXT_SHOVE;
                            desVy += (tdy / tDist) * shoveDepth * TEXT_SHOVE;
                        }
                    } else {
                        const bcx = box.x + box.w / 2;
                        const bcy = box.y + box.h / 2;
                        const bx = b.x - bcx;
                        const by = b.y - bcy;
                        const bDist = Math.sqrt(bx * bx + by * by) || 1;
                        desVx += (bx / bDist) * TEXT_MARGIN * TEXT_PUSH;
                        desVy += (by / bDist) * TEXT_MARGIN * TEXT_PUSH;
                    }
                }
            }

            const desMag = Math.sqrt(desVx * desVx + desVy * desVy) || 1;
            desVx = (desVx / desMag) * CRUISE_SPEED;
            desVy = (desVy / desMag) * CRUISE_SPEED;

            b.vx += (desVx - b.vx) * TURN_RATE;
            b.vy += (desVy - b.vy) * TURN_RATE;

            const mag = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
            b.vx = (b.vx / mag) * CRUISE_SPEED;
            b.vy = (b.vy / mag) * CRUISE_SPEED;

            b.x += b.vx;
            b.y += b.vy;

            b.flapPhase = (b.flapPhase + FLAP_SPEED) % FRAME_SEQ.length;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = false;

        const spriteW = FRAMES[0][0].length * PX;
        const spriteH = FRAMES[0].length * PX;

        for (const b of boids) {
            const frameIdx = Math.floor(b.flapPhase) % FRAME_SEQ.length;
            const sprite = spriteCache[frameIdx].normal;

            const px = Math.round(b.x - spriteW / 2);
            const py = Math.round(b.y - spriteH / 2);
            ctx.drawImage(sprite, px, py);
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', e => {
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    });
    canvas.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
    });
    init();
    loop();
})();
