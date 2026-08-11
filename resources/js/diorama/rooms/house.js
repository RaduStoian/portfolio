// The "about me" room, redrawn in the diorama style: flat cutout layers with
// native canvas drop shadows, instead of pixel-grid sprites. Laid out to
// match game/art/house.js + game/scenes/house.vue as closely as the two
// styles allow — same beam, window, pegboard, bookshelf, record stand, desk
// and couch arrangement — while sharing no code with them.

import { D } from '../palette.js';
import { withShadow, roundedPanel, foldShade, glow, hash2 } from '../render.js';

export const ROOM_W = 480;
export const ROOM_H = 300;

const WINDOW = { x: 58, y: 18, w: 92, h: 104, r: 10 };
const GLASS = { x: 67, y: 27, w: 74, h: 86, r: 6 };
const BEAM_Y = 112;

const STARS = Array.from({ length: 14 }, (_, i) => ({
    x: GLASS.x + 8 + hash2(i, 1, 91) * (GLASS.w - 16),
    y: GLASS.y + 6 + hash2(i, 2, 92) * (GLASS.h * 0.5),
    r: 0.5 + hash2(i, 3, 93) * 0.9,
    phase: hash2(i, 4, 94) * Math.PI * 2,
    speed: 1.2 + hash2(i, 5, 95) * 1.4,
}));

const RAIN = Array.from({ length: 34 }, (_, i) => ({
    x: GLASS.x + hash2(i, 1, 201) * GLASS.w,
    y0: hash2(i, 2, 202) * GLASS.h,
    len: 5 + hash2(i, 3, 203) * 7,
    speed: 80 + hash2(i, 4, 204) * 55,
    drift: -5 + hash2(i, 5, 205) * 2.5,
}));

function drawBeams(ctx) {
    withShadow(ctx, () => {
        // Sloped roof beams meeting the tie beam at each corner.
        ctx.fillStyle = D.beam;
        ctx.beginPath();
        ctx.moveTo(0, 138); ctx.lineTo(122, 6); ctx.lineTo(134, 6); ctx.lineTo(14, 144);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ROOM_W, 138); ctx.lineTo(ROOM_W - 122, 6); ctx.lineTo(ROOM_W - 134, 6); ctx.lineTo(ROOM_W - 14, 144);
        ctx.closePath(); ctx.fill();

        roundedPanel(ctx, 0, BEAM_Y, ROOM_W, 12, 0, D.beam);
    }, { dy: 6, blur: 8 });
    roundedPanel(ctx, 0, BEAM_Y, ROOM_W, 3, 0, D.beamLit);
}

function drawWindow(ctx, t) {
    withShadow(ctx, () => roundedPanel(ctx, WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, WINDOW.r, D.frame), { dy: 7, blur: 12 });

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, GLASS.r);
    ctx.clip();

    const sky = ctx.createLinearGradient(0, GLASS.y, 0, GLASS.y + GLASS.h);
    sky.addColorStop(0, D.sky);
    sky.addColorStop(1, D.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);

    const moonX = GLASS.x + 40;
    const moonY = GLASS.y + 22;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 12, 0, Math.PI * 2);
    ctx.fillStyle = D.moon;
    ctx.fill();

    for (const s of STARS) {
        ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = D.star;
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    const cloudDrift = (baseX, speed) => GLASS.x + (((baseX + t * speed) % (GLASS.w + 60)) - 30);
    ctx.filter = 'blur(3px)';
    for (const [bx, by, rx, ry, speed, alpha] of [
        [4, 18, 22, 8, 2.6, 0.55],
        [40, 34, 26, 9, 3.6, 0.42],
    ]) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = D.cloud;
        ctx.beginPath();
        ctx.ellipse(cloudDrift(bx, speed), GLASS.y + by, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    ctx.strokeStyle = D.rain;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.55;
    for (const drop of RAIN) {
        const y = GLASS.y + ((drop.y0 + t * drop.speed) % GLASS.h);
        ctx.beginPath();
        ctx.moveTo(drop.x, y);
        ctx.lineTo(drop.x + drop.drift, y + drop.len);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.fillStyle = D.frame;
    ctx.fillRect(GLASS.x + GLASS.w / 2 - 2, GLASS.y, 3.5, GLASS.h);
    ctx.fillRect(GLASS.x, GLASS.y + GLASS.h / 2 - 2, GLASS.w, 3.5);
}

const NOTES = [
    { x: 10, y: 8, w: 22, h: 16, color: D.noteYellow },
    { x: 48, y: 4, w: 20, h: 16, color: D.noteRose },
    { x: 66, y: 26, w: 20, h: 16, color: D.notePale },
    { x: 14, y: 52, w: 20, h: 16, color: D.noteCream },
    { x: 44, y: 56, w: 20, h: 16, color: D.noteYellow },
];

function drawPegboard(ctx) {
    const bx = 168, by = 18, bw = 90, bh = 92;
    withShadow(ctx, () => roundedPanel(ctx, bx, by, bw, bh, 4, D.board), { dy: 6, blur: 8 });
    roundedPanel(ctx, bx + 4, by + 4, bw - 8, bh - 8, 3, D.boardFace);

    ctx.strokeStyle = D.string;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(bx + NOTES[0].x + 20, by + NOTES[0].y + 10);
    ctx.lineTo(bx + NOTES[2].x + 4, by + NOTES[2].y + 6);
    ctx.moveTo(bx + NOTES[1].x + 6, by + NOTES[1].y + 14);
    ctx.lineTo(bx + NOTES[4].x + 10, by + NOTES[4].y + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (const note of NOTES) {
        withShadow(ctx, () => roundedPanel(ctx, bx + note.x, by + note.y, note.w, note.h, 2, note.color), { dy: 2, blur: 3, color: 'rgba(10,8,10,0.35)' });
        ctx.beginPath();
        ctx.arc(bx + note.x + note.w / 2, by + note.y + 3, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = D.pin;
        ctx.fill();
    }
}

function drawBookshelf(ctx, t) {
    const bx = 272, by = 16, bw = 76, bh = 96;
    withShadow(ctx, () => roundedPanel(ctx, bx, by, bw, bh, 4, D.shelf), { dy: 6, blur: 8 });
    roundedPanel(ctx, bx + 3, by + 3, bw - 6, bh - 6, 3, D.shelfFace);

    const colors = [D.bookRed, D.bookBlue, D.bookGreen, D.bookPurple, D.bookMaroon, D.bookGold];
    let seed = 0;
    for (const rowY of [by + 8, by + 38, by + 68]) {
        roundedPanel(ctx, bx + 3, rowY + 22, bw - 6, 4, 1, D.shelf);
        let x = bx + 8;
        while (x < bx + bw - 8) {
            const bwid = 5 + (seed % 3) * 2;
            const bookH = 16 + ((seed * 5) % 10);
            roundedPanel(ctx, x, rowY + 22 - bookH, bwid, bookH, 1, colors[seed % colors.length]);
            x += bwid + 1.5;
            seed++;
        }
    }
}

function drawRecordStand(ctx, t, musicOn) {
    withShadow(ctx, () => {
        roundedPanel(ctx, 258, 150, 68, 8, 2, D.deskDark);
        roundedPanel(ctx, 264, 158, 6, 16, 1, D.deskDark);
        roundedPanel(ctx, 314, 158, 6, 16, 1, D.deskDark);
    }, { dy: 5, blur: 6 });

    withShadow(ctx, () => roundedPanel(ctx, 260, 112, 64, 38, 4, D.recordCase), { dy: 5, blur: 7 });
    roundedPanel(ctx, 264, 116, 24, 30, 3, D.recordCaseDark);

    ctx.save();
    ctx.translate(304, 131);
    if (musicOn) ctx.rotate(t * 1.6);
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = D.platter;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = D.platterCenter;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = D.deskDark;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(318, 120);
    ctx.lineTo(310, 126);
    ctx.stroke();

    if (musicOn) {
        for (let i = 0; i < 3; i++) {
            const x = 300 + i * 9 + Math.sin(t * 2 + i) * 2;
            const y = 108 - ((t * 14 + i * 10) % 30);
            ctx.globalAlpha = Math.max(0, 1 - ((t * 14 + i * 10) % 30) / 30);
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = i % 2 ? D.noteRose : D.noteYellow;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

function drawCouch(ctx) {
    const back = foldShade(D.couch, { x: 0, y: -1, z: 0.5 });
    const seat = foldShade(D.couch, { x: 0, y: -0.2, z: 1 });
    const arm = foldShade(D.couchDeep, { x: -1, y: -0.1, z: 0.4 });
    const plinth = foldShade(D.couchDeep, { x: 0, y: 1, z: 0.2 });

    withShadow(ctx, () => roundedPanel(ctx, 22, 222, 168, 16, 5, plinth), { dy: 8, blur: 10 });
    withShadow(ctx, () => roundedPanel(ctx, 14, 158, 178, 48, 14, back));
    withShadow(ctx, () => roundedPanel(ctx, 8, 170, 24, 60, 10, arm));
    withShadow(ctx, () => roundedPanel(ctx, 178, 170, 24, 60, 10, arm));
    withShadow(ctx, () => roundedPanel(ctx, 18, 194, 168, 38, 12, seat));
    // Seam between the two seat cushions, like the pixel couch's split.
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000';
    ctx.fillRect(101, 198, 2, 30);
    ctx.restore();

    withShadow(ctx, () => {
        ctx.save();
        ctx.translate(100, 184);
        ctx.rotate(-0.1);
        roundedPanel(ctx, -15, -15, 30, 30, 7, D.pillow);
        ctx.restore();
    }, { dy: 4, blur: 6, color: 'rgba(20,14,26,0.35)' });
    roundedPanel(ctx, 90, 172, 12, 4, 2, D.pillowDark);
}

function drawCat(ctx, tailAngle) {
    const cx = 216;
    const cy = 244;

    withShadow(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 32, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = D.catDark;
        ctx.fill();
    }, { dy: 3, blur: 5, color: 'rgba(15,12,18,0.3)' });

    ctx.save();
    ctx.translate(cx - 28, cy - 4);
    ctx.rotate(tailAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-15, -2, -17, -15);
    ctx.quadraticCurveTo(-18, -22, -9, -20);
    ctx.strokeStyle = D.catDark;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 28, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = D.cat;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + 22, cy - 8, 12, 0, Math.PI * 2);
    ctx.fillStyle = D.cat;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 13, cy - 15);
    ctx.lineTo(cx + 16, cy - 24);
    ctx.lineTo(cx + 21, cy - 16);
    ctx.moveTo(cx + 27, cy - 17);
    ctx.lineTo(cx + 31, cy - 25);
    ctx.lineTo(cx + 34, cy - 16);
    ctx.closePath();
    ctx.fillStyle = D.cat;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 11, cy - 6);
    ctx.quadraticCurveTo(cx + 3, cy - 6, cx - 3, cy - 3);
    ctx.strokeStyle = D.catFace;
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawDesk(ctx) {
    const top = foldShade(D.desk, { x: 0, y: -1, z: 0.4 });
    const front = foldShade(D.desk, { x: 0, y: 0.2, z: 1 });
    const leg = foldShade(D.deskDark, { x: 0, y: 0, z: 1 });

    withShadow(ctx, () => {
        roundedPanel(ctx, 262, 156, 12, 76, 3, leg);
        roundedPanel(ctx, 446, 156, 12, 76, 3, leg);
    }, { dy: 8, blur: 8 });
    withShadow(ctx, () => roundedPanel(ctx, 254, 154, 210, 46, 5, front));
    roundedPanel(ctx, 386, 160, 62, 34, 4, D.drawer);
    for (const y of [166, 178, 190]) roundedPanel(ctx, 424, y, 12, 4, 2, D.pull);
    withShadow(ctx, () => roundedPanel(ctx, 250, 140, 218, 16, 5, top), { dy: 6, blur: 8 });
}

function drawMonitor(ctx, t, on) {
    withShadow(ctx, () => {
        roundedPanel(ctx, 326, 128, 8, 14, 2, D.monitor);
        roundedPanel(ctx, 300, 82, 66, 58, 8, D.monitor);
    }, { dy: 5, blur: 8 });

    const flicker = on ? 0.85 + Math.sin(t * 9) * 0.08 : 0;
    if (on) {
        glow(ctx, 333, 108, 50, D.screenLine2, 0.4 * flicker);
        roundedPanel(ctx, 306, 88, 54, 42, 4, D.screen);
        const lines = [
            { y: 96, w: 30, color: D.screenLine1 },
            { y: 104, w: 44, color: D.screenLine2 },
            { y: 112, w: 22, color: D.screenLine3 },
            { y: 120, w: 36, color: D.screenLine2 },
        ];
        for (const line of lines) {
            ctx.globalAlpha = 0.9;
            roundedPanel(ctx, 312, line.y, line.w, 3, 1.5, line.color);
        }
        ctx.globalAlpha = 1;
        ctx.globalAlpha = 0.14 * flicker;
        roundedPanel(ctx, 280, 152, 110, 6, 3, D.screenLine2);
        ctx.globalAlpha = 1;
    } else {
        roundedPanel(ctx, 306, 88, 54, 42, 4, '#14121c');
    }
}

function drawLamp(ctx, t) {
    ctx.strokeStyle = D.deskDark;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(452, 154);
    ctx.lineTo(458, 118);
    ctx.lineTo(438, 100);
    ctx.stroke();

    const flicker = 0.85 + Math.sin(t * 5.2) * 0.08;
    glow(ctx, 424, 98, 36, D.lampGlow, 0.55 * flicker);

    withShadow(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(408, 96);
        ctx.lineTo(440, 96);
        ctx.lineTo(432, 110);
        ctx.lineTo(416, 110);
        ctx.closePath();
        ctx.fillStyle = D.lampShade;
        ctx.fill();
    }, { dy: 4, blur: 6 });
}

function drawMug(ctx) {
    withShadow(ctx, () => {
        roundedPanel(ctx, 282, 122, 20, 18, 4, D.mug);
        ctx.beginPath();
        ctx.arc(304, 131, 6, -0.9, 0.9);
        ctx.strokeStyle = D.mugDark;
        ctx.lineWidth = 3;
        ctx.stroke();
    }, { dy: 3, blur: 5 });
    roundedPanel(ctx, 282, 122, 20, 5, 4, D.mugDark);
}

function drawSteam(ctx, puffs) {
    ctx.save();
    ctx.filter = 'blur(2.5px)';
    for (const puff of puffs) {
        const life = Math.max(0, 1 - puff.age / puff.life);
        ctx.globalAlpha = life * 0.5;
        ctx.beginPath();
        ctx.ellipse(puff.x, puff.y, 3.2, 4.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = D.steam;
        ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawRug(ctx) {
    withShadow(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(230, 268, 150, 30, 0, 0, Math.PI * 2);
        ctx.fillStyle = D.rug;
        ctx.fill();
    }, { dy: 3, blur: 10, color: 'rgba(10,8,12,0.25)' });

    ctx.fillStyle = D.rugDot;
    for (let x = 120; x <= 340; x += 16) {
        ctx.beginPath();
        ctx.arc(x, 250, 1.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawRoom(ctx, t, state) {
    const wall = ctx.createLinearGradient(0, 0, 0, ROOM_H);
    wall.addColorStop(0, D.wallTop);
    wall.addColorStop(1, D.wallBottom);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, ROOM_W, 236);

    const floor = ctx.createLinearGradient(0, 236, 0, ROOM_H);
    floor.addColorStop(0, D.floor);
    floor.addColorStop(1, D.floorDark);
    ctx.fillStyle = floor;
    ctx.fillRect(0, 236, ROOM_W, ROOM_H - 236);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let x = 16; x < ROOM_W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 236);
        ctx.lineTo(x, ROOM_H);
        ctx.stroke();
    }

    drawBeams(ctx);
    drawWindow(ctx, t);
    drawPegboard(ctx);
    drawBookshelf(ctx, t);
    drawRug(ctx);
    drawRecordStand(ctx, t, state.musicOn);
    drawCouch(ctx);
    drawCat(ctx, state.tailAngle);
    drawDesk(ctx);
    drawMonitor(ctx, t, true);
    drawLamp(ctx, t);
    drawMug(ctx);
    drawSteam(ctx, state.steam);

    const vignette = ctx.createRadialGradient(ROOM_W / 2, ROOM_H / 2, ROOM_H * 0.3, ROOM_W / 2, ROOM_H / 2, ROOM_W * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(10,6,16,0.32)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
}
