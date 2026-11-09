/* czestochowa-switch — Jasna Góra over today's Aleje: café terraces, trees and a red-and-white Twist tram. */
(() => {
  const { PAD_Y, BW, BH, clamp, mix, smooth, rng } = CitySwitch;
  const NOON = 0, GOLD = 1, DUSK = 2, NIGHT = 3, DAWN = 4;
  let M, N;
  const SKY = [
    ['#4189bd', '#6fa9ce', '#a0c9df', '#d0e3ec', '#f5efdb'],
    ['#7298bc', '#b2adbc', '#e0b19f', '#f5c28d', '#ffe5af'],
    ['#2f416b', '#635a83', '#ad7d99', '#df9a96', '#f5c0a3'],
    ['#081329', '#111f3b', '#1d304c', '#30455e', '#4a6070'],
    ['#3e5e87', '#7b95b2', '#bcb9c6', '#e6cfc2', '#f6e7d0'],
  ];
  const palette = ({mat, neon}) => {
    for (const [name, hex] of Object.entries({
      HALL: '#bd765c', HALL_SH: '#995d4b', TRIM: '#f7edd7', FRAME: '#a6b6b5',
      COPPER: '#637b70', COPPER_D: '#3d5b54', COPPER_L: '#96aa8c',
      CREAM: '#eee2c8', CREAM_D: '#cbbd9f', TEN_Y: '#e4c992', TEN_P: '#e2b6a5',
      TEN_G: '#b4cbb8', TILE_R: '#a36752', TILE_D: '#744a3d',
      FGL: '#678e9c', FGL_H: '#bfd6dc', STONE: '#c8c5b9', STONE_D: '#a5aea8',
      TIMBER: '#8b6c4d', TIMBER_D: '#5b4c3e', TREE: '#5a8a50', TREE_D: '#355d4d',
      TREE_L: '#8db466', LIME_S: '#bccfb2', LEAF: '#73965e', PLANTER: '#737f78',
      CHAIR: '#506b65', LABEL: '#e9ca8e', TRAM_R: '#d94446', TRAM_D: '#a62f39',
      TRAM_W: '#e9eeea', TRAM_GL: '#243e51', RAIL: '#8d999d',
    })) mat(name,hex);
    mat('PAVE', '#d0cfc3', { [NIGHT]: '#30404e' });
    mat('PAVE_D', '#b7bbb1', { [NIGHT]: '#293743' });
    mat('CLOUD', '#fff9ef', { [GOLD]: '#ffe7c6', [DUSK]: '#ca9eb0', [NIGHT]: '#354961', [DAWN]: '#e5d2d0' });
    mat('CLOUD_SH', '#d6e4ea', { [GOLD]: '#e8c3ae', [DUSK]: '#9b7e98', [NIGHT]: '#293c55', [DAWN]: '#bdb7c7' });
    neon('FLOOD', '#ffe4a7', '#f5c17b', .22);
    neon('LED_SOFT', '#f9f5df', '#dce9ed', .28);
    neon('TRAM_LED', '#ffc47a', '#ff9b49', .28);
    // The tower's cool-white floodlighting, a step dimmer than its clock faces.
    neon('TOWER', '#cdd8d6', '#dce9ed', .16);
  };
  const grade = [
    ([r, g, b]) => [r, g, b],
    ([r, g, b]) => [r * 1.02 + .03, g * .85 + .02, b * .72],
    ([r, g, b]) => [r * .57 + .035, g * .51 + .025, b * .61 + .04],
    ([r, g, b]) => [r * .22 + .025, g * .26 + .03, b * .36 + .045],
    ([r, g, b]) => [r * .73 + .04, g * .7 + .03, b * .77 + .04],
  ];
  const line = (x0, y0, x1, y1, cb) => {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      cb(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  // The limes of the Aleje (silver lime in I and II Aleja, Dutch lime in III): a dense egg-shaped crown,
  // widest low down and trimmed flat underneath, with pale leaf undersides showing on the sunny side.
  const lime = (w, cx, bottom, rw, h, r) => {
    for (let j = 0; j < h; j++) {
      const t = j / (h - 1);
      const half = Math.round(rw * Math.sqrt(Math.max(0, 1 - ((t - .64) / (t < .64 ? .66 : .4)) ** 2)) + (r() - .5) * 1.2);
      for (let x = -half; x <= half; x++) {
        const v = r();
        let m = v < .3 ? M.TREE_D : M.TREE;
        if (x > half * .35 || t > .85) m = v < .75 ? M.TREE_D : M.TREE;
        else if (x < -half * .15 && t < .7) m = v < .14 ? M.LIME_S : v < .6 ? M.TREE_L : M.TREE;
        w.px(cx + x, bottom - h + 1 + j, m);
      }
    }
  };

  const smoothSky = (w, key, ctx) => {
    const stops = SKY[key].map(ctx.rgb);
    const end = PAD_Y + 106;
    const at = (y) => {
      const p = clamp(Math.pow(clamp(y, 0, BH) / end, 1.25)) * 3.999;
      const lo = Math.floor(p);
      return stops[lo].map((v, i) => mix(v, stops[lo + 1][i], p - lo));
    };
    for (let y = 0; y < BH; y++) {
      w.skyLo[key][y] = ctx.pack(at(y));
      w.skyHi[key][y] = ctx.pack(at(y + 4));
    }
  };

  const dome = (u, centre, radius) => Math.sqrt(Math.max(0, 1 - ((u - centre) / radius) ** 2));
  // Jasna Góra closes the Aleje to the west: the sun comes up over the tenements, stands above the
  // avenue at noon and goes down behind the monastery beside the tower. The moon follows the same way.
  const drawSky = (w, dt, hour) => {
    const h = hour;
    if (h < 18.5) {
      const t = clamp((h - 12) / 6.3);
      const low = smooth(15.8, 17.6, h);
      w.sun(mix(214, 30, t * (.6 + .4 * t)), 20 + 54 * Math.pow(t, 2.4), low > .3 ? 7 : 5, low);
    } else if (h > 29.3) {
      const t = clamp((h - 29.3) / 6.7);
      const low = 1 - smooth(30.4, 32.2, h);
      w.sun(mix(322, 214, t), 80 - 60 * Math.sin(t * Math.PI / 2), low > .3 ? 7 : 5, low);
    }
    if (h > 18.9 && h < 29.6) {
      const t = (h - 18.9) / 10.7;
      w.moon(mix(286, 92, t), 44 - 28 * Math.sin(t * Math.PI));
    }
    w.drawStars();
    // Fair-weather cumulus on the west wind: a flat base under three domes, the tallest off-centre.
    for (const c of w.cumulus) {
      c.x += c.v * dt;
      if (c.x > 372) c.x = -c.w - 44;
      const cx = Math.round(c.x);
      for (let i = 0; i < c.w; i++) {
        const u = i / c.w;
        const top = Math.round(c.h * Math.max(dome(u, .2, .2) * .55, dome(u, .5, .3), dome(u, .82, .18) * .45));
        for (let j = 0; j <= top; j++) w.pxSky(cx + i, c.y - j, j === 0 || (u > .5 && j < top * .4) ? M.CLOUD_SH : M.CLOUD);
      }
    }
  };

  const windowAt = (w, x, y, width, height, group) => {
    w.rect(x - 1, y - 1, width + 2, height + 2, M.TRIM);
    w.rect(x, y, width, height, M.FGL);
    w.rect(x, y, 1, height, M.FGL_H);
    if (group) w.lightRect(x + 1, y + 1, width - 1, height - 1, N.WARM, group);
    w.rect(x + Math.floor(width / 2), y, 1, height, M.FRAME);
    w.rect(x - 1, y + height, width + 2, 1, M.STONE_D);
  };

  const drawSquare = (w) => {
    // Large pale paving slabs, with a darker granite band across the pedestrian square.
    for (let y = 112; y < 150; y++) for (let x = -40; x < 360; x++) {
      const joint = y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 6) % 12 === 0;
      w.px(x, y, joint ? M.PAVE_D : M.PAVE);
    }
    w.rect(-40, 135, 400, 2, M.STONE_D);
    w.rect(-40, 137, 400, 1, M.PAVE_D);
  };

  // `guest` is the shirt of whoever sits there while the café is open; they lift the cup now and then.
  const terrace = (w, x, y, umbrella, guest) => {
    w.rect(x + 6, y - 9, 1, 12, M.CHAIR);
    for (let dx = -2; dx <= 14; dx++) {
      const top = y - 11 + Math.floor(Math.abs(dx - 6) / 4);
      w.rect(x + dx, top, 1, y - 7 - top, umbrella);
    }
    if (guest) {
      w.rect(x + 1, y - 6, 2, 3, M.SKIN);
      w.rect(x + 1, y - 6, 2, 1, M.HAIR);
      w.rect(x + 1, y - 3, 2, 5, guest);
      w.rect(x + 1, y + 2, 3, 1, M.SUIT);
      w.rect(x + 3, y + 3, 1, 2, M.SUIT);
    }
    const sip = guest && (w.t * .5 + x) % 9 < 1.2;
    w.rect(x + 2, y, 9, 1, M.TIMBER);
    w.rect(x + 6, y + 1, 1, 4, M.CHAIR);
    for (const dx of [0, 12]) {
      w.rect(x + dx, y - 1, 1, 5, M.CHAIR);
      w.rect(x + dx - 1, y + 2, 3, 1, M.CHAIR);
    }
    w.px(sip ? x + 3 : x + 4, sip ? y - 4 : y - 1, M.TRIM);
    w.px(x + 8, y - 1, M.LABEL);
    if (guest && w.dark > .3) w.pxLight(x + 8, y - 1, N.YELLOW);
  };

  const drawJasnaGora = (w) => {
    // Monastery on its green rise, with the white tower and dark upper lantern.
    for (let x = -40; x < 125; x++) {
      const top = 105 - Math.round(Math.sin((x + 40) / 165 * Math.PI) * 15);
      w.rect(x, top, 1, 113 - top, M.TREE_D);
    }
    w.rect(-10, 79, 109, 23, M.CREAM);
    w.rect(-10, 97, 109, 5, M.CREAM_D);
    w.rect(-12, 77, 113, 3, M.TILE_D);
    for (let x = -4; x < 96; x += 8) {
      w.rect(x, 84, 3, 6, M.FGL);
      // Cells and corridors come on one by one rather than as a single block.
      w.lightRect(x, 85, 3, 5, N.WARM_DIM, (x >> 3) % 3 ? w.winGroups[(x + 9) % 28] : w.monasteryG);
      w.rect(x, 94, 3, 5, M.FGL);
      if ((x >> 3) % 2) w.lightRect(x, 94, 3, 3, N.WARM_DIM, w.winGroups[(x + 20) % 28]);
    }
    // Basilica nave, apse and copper roof.
    w.rect(4, 61, 46, 19, M.CREAM);
    for (let y = 51; y < 61; y++) w.rect(4 + (61 - y), y, 46 - (61 - y) * 2, 1, M.COPPER_D);
    w.rect(22, 46, 5, 10, M.CREAM);
    w.rect(24, 40, 1, 7, M.COPPER_D);
    w.rect(22, 42, 5, 1, M.COPPER_D);
    const x = 62;
    w.rect(x - 7, 37, 15, 45, M.CREAM);
    w.rect(x + 5, 37, 3, 45, M.CREAM_D);
    // After dark the shaft is floodlit cool white from the monastery roofs, cornices brightest; windows stay dark.
    w.lightRect(x - 7, 37, 12, 38, N.TOWER, w.monasteryG);
    for (const y of [37, 50, 66, 78]) {
      w.rect(x - 9, y, 19, 2, M.TRIM);
      if (y < 78) w.lightRect(x - 9, y, 19, 2, N.LED_SOFT, w.monasteryG);
    }
    for (const [y, height] of [[54, 8], [68, 6]]) {
      w.rect(x - 3, y, 6, height, M.FGL);
      w.rect(x - 1, y, 2, height, M.CREAM_D);
    }
    // The clock sits high on the tower, between the first two cornices below the lantern.
    w.monasteryClockAt = [x, 44];
    w.rect(x - 4, 26, 9, 11, M.COPPER_D);
    w.rect(x - 2, 28, 5, 7, M.TRIM);
    w.lightRect(x - 2, 28, 5, 7, N.TOWER, w.monasteryG);
    w.rect(x, 28, 1, 7, M.COPPER_D);
    for (let y = 17; y < 26; y++) {
      const half = Math.max(1, Math.round((y - 17) * .7));
      w.rect(x - half, y, half * 2 + 1, 1, y % 3 ? M.COPPER_D : M.COPPER);
    }
    w.rect(x, 8, 1, 10, M.COPPER_D);
    w.rect(x - 2, 11, 5, 1, M.COPPER_D);
    w.tube(x, 16, M.LABEL, N.FLOOD, w.monasteryG);
    w.lightRect(x - 6, 75, 13, 2, N.FLOOD, w.monasteryG);
    w.lightRect(0, 97, 96, 2, N.FLOOD, w.monasteryG);
  };

  const drawTownHall = (w) => {
    // The russet Ratusz on Plac Biegańskiego: long wings and a central clock tower.
    w.rect(137, 81, 74, 31, M.HALL);
    w.rect(205, 81, 6, 31, M.HALL_SH);
    w.rect(135, 79, 78, 3, M.TILE_D);
    w.rect(137, 96, 74, 1, M.TRIM);
    w.rect(137, 110, 74, 3, M.CREAM_D);
    for (const x of [142, 153, 186, 197]) {
      windowAt(w, x, 86, 5, 7, w.winGroups[x % 28]);
      windowAt(w, x, 100, 5, 8, w.hallG);
    }
    w.rect(164, 66, 20, 46, M.HALL);
    w.rect(180, 66, 4, 46, M.HALL_SH);
    w.rect(162, 65, 24, 2, M.TRIM);
    w.rect(162, 79, 24, 2, M.TRIM);
    w.rect(167, 56, 14, 10, M.HALL);
    w.rect(166, 55, 16, 2, M.TRIM);
    w.rect(168, 53, 12, 2, M.TILE_D);
    w.rect(174, 46, 1, 8, M.COPPER_D);
    windowAt(w, 171, 85, 6, 9, w.hallG);
    w.rect(169, 101, 11, 11, M.COPPER_D);
    w.rect(171, 102, 7, 10, M.FGL);
    w.lightRect(171, 102, 7, 10, N.WARM, w.hallG);
    w.clockAt = [174, 72];
    w.lightRect(139, 108, 23, 2, N.FLOOD, w.hallG);
    w.lightRect(187, 108, 22, 2, N.FLOOD, w.hallG);
  };

  const drawAleje = (w) => {
    const blocks = [[218, 31, 75, M.TEN_Y], [249, 36, 65, M.TEN_P], [285, 36, 70, M.TEN_G], [321, 39, 79, M.CREAM]];
    for (const [x, width, top, wall] of blocks) {
      w.rect(x, top, width, 113 - top, wall);
      w.rect(x + width - 2, top, 2, 113 - top, M.CREAM_D);
      w.rect(x - 1, top - 2, width + 2, 3, M.TILE_D);
      w.rect(x, 94, width, 2, M.TRIM);
      for (let y = top + 6; y <= 85; y += 13) for (let dx = 5; dx < width - 5; dx += 11) windowAt(w, x + dx, y, 5, 8, w.winGroups[(y + dx) % 28]);
      w.rect(x + 2, 106, width - 4, 7, M.FGL);
      w.lightRect(x + 3, 107, width - 6, 5, N.WARM, w.cafeG);
      for (let dx = 10; dx < width - 3; dx += 10) w.rect(x + dx, 106, 1, 7, M.COPPER_D);
    }
    w.hsign(219, 95, 29, 10, 'KAWA', { n: N.B_WHITE, g: w.cafeG, board: M.COPPER_D, off: M.TRIM, font: 5 });
    w.hsign(252, 94, 56, 12, 'KSIĄŻKI', { n: N.LED_SOFT, g: w.cafeG, board: M.COPPER_D, off: M.TRIM });
  };

  // Walkers keep to the pavement in front of the shops, feet on rows FEET..FEET+2. Anything
  // standing nearer than that lane is repainted after them every frame, so it hides them.
  const FEET = 115;
  // The tram runs below them, its roof well clear of the lane; the wire sits just above its pantograph.
  const TRAM_Y = 147, WIRE = TRAM_Y - 23, MAST0 = 30, SPAN = 116, SAG = 2;
  // A tree-lined pedestrian axis leads toward Jasna Góra through the gap.
  const TREES = [[101, 104, 5], [116, 111, 7], [126, 120, 9], [81, 112, 7], [51, 122, 9]];
  const LAMPS = [[103, 109], [111, 118], [103, 132]];
  const drawProps = (w, front, open) => {
    for (const [x, y, radius] of TREES) if (y + 6 > FEET === front) {
      w.rect(x, y - 8, 1, 13, M.TIMBER_D);
      lime(w, x, y - 6, radius - 1, radius * 2 + 6, rng(x));
      w.rect(x - 4, y + 3, 9, 4, M.PLANTER);
      w.rect(x - 4, y + 3, 9, 1, M.LEAF);
    }
    for (const [x, y] of LAMPS) if (y + 2 > FEET === front) {
      w.rect(x, y - 17, 1, 20, M.COPPER_D);
      w.rect(x - 3, y - 18, 7, 1, M.COPPER_D);
      w.lightRect(x - 2, y - 17, 5, 1, N.LED_SOFT, w.hallG);
    }
    if (!front) return;
    // Café gardens between the walkers and the tram, umbrellas clear of the shop signs.
    terrace(w, 240, 118, M.TRIM, open && M.SHIRT_B); terrace(w, 276, 118, M.COPPER, open && M.TRAM_D); terrace(w, 311, 118, M.TRIM, open && M.COAT);
    // The tram's contact wire sags between masts on the far side of the track, below the shopfronts.
    for (let x = MAST0 - SPAN; x < 360; x += SPAN) w.wire(x, WIRE, x + SPAN, WIRE, SAG);
    for (let x = MAST0; x < 360; x += SPAN) {
      w.rect(x, WIRE - 10, 1, TRAM_Y - 8 - (WIRE - 10), M.COPPER_D);
      w.rect(x - 1, WIRE - 10, 3, 1, M.COPPER_D);
      line(x + 1, WIRE - 6, x + 3, WIRE - 1, (px, py) => w.px(px, py, M.COPPER_D));
    }
  };
  // Height of the wire above x, matching w.wire()'s curve, so the pantograph always touches it.
  const wireAt = (x) => {
    const t = ((((x - MAST0) % SPAN) + SPAN) % SPAN) / SPAN;
    return Math.round(WIRE + SAG * 4 * t * (1 - t));
  };

  const drawTram = (w, dt) => {
    w.tramX += dt * 22;
    if (w.tramX > 380) w.tramX = -150;
    const x = Math.round(w.tramX), y = TRAM_Y;
    for (let i = 0; i < 3; i++) {
      const sx = x + i * 28;
      // MPK's 2012 Twist: red to the roof line, grey roof gear, one dark window band, a white waist stripe.
      w.rect(sx, y - 16, 26, 15, M.TRAM_R);
      w.rect(sx + 4, y - 17, 18, 1, M.STEEL);
      w.rect(sx, y - 14, 26, 8, M.TRAM_GL);
      w.rect(sx, y - 6, 26, 1, M.TRAM_W);
      w.rect(sx, y - 2, 26, 2, M.TRAM_D);
      w.rect(sx + 3, y - 14, 1, 8, M.FRAME);
      w.rect(sx + 16, y - 14, 1, 8, M.FRAME);
      w.rect(sx + 17, y - 13, 6, 10, M.TRAM_GL);
      if (w.dark > .2) w.lightRect(sx + 5, y - 13, 10, 5, N.WARM_DIM, w.tramG);
      w.rect(sx + 5, y, 4, 1, M.TIRE);
      w.rect(sx + 19, y, 4, 1, M.TIRE);
      if (i < 2) w.rect(sx + 26, y - 14, 2, 13, M.STEEL_LT);
    }
    // Raked cab with a white windscreen surround over the red bumper; amber route display in the leading window.
    w.rect(x + 82, y - 14, 2, 12, M.TRAM_R);
    w.rect(x + 84, y - 13, 1, 11, M.TRAM_R);
    w.rect(x + 82, y - 14, 2, 8, M.TRAM_GL);
    w.rect(x + 84, y - 12, 1, 6, M.TRAM_W);
    w.rect(x + 82, y - 6, 3, 1, M.TRAM_W);
    w.px(x + 84, y - 4, M.TRIM);
    if (w.dark > .2) w.pxLight(x + 84, y - 4, N.HEAD);
    w.lightRect(x + 61, y - 14, 9, 1, N.TRAM_LED, w.tramG);
    // Single-arm pantograph on the leading section, knee forward, its head following the wire.
    const hx = x + 66, top = wireAt(hx) + 1;
    w.rect(hx - 3, top, 7, 1, M.COPPER_D);
    line(hx, top + 1, hx + 4, y - 19, (px,py)=>w.px(px,py,M.COPPER_D));
    line(hx + 4, y - 19, hx + 1, y - 18, (px,py)=>w.px(px,py,M.COPPER_D));
  };

  // A walking pilgrimage on its last stretch to Jasna Góra: a flowered wooden cross in front, then the group's sign.
  const drawPilgrimage = (w) => {
    const [lead, , bearer] = w.pilgrims;
    const cx = Math.round(lead.x) - 1, sx = Math.round(bearer.x) - 1, y = lead.y;
    w.rect(cx, y - 10, 1, 7, M.TIMBER);
    w.rect(cx - 1, y - 9, 3, 1, M.TIMBER);
    w.px(cx, y - 8, M.TRAM_R);
    w.rect(sx, y - 8, 1, 5, M.TIMBER_D);
    w.rect(sx - 1, y - 10, 5, 2, M.BOARD_B);
    w.px(sx + 1, y - 10, M.BOARD_Y);
  };

  const build = (w, ctx) => {
    M=ctx.M; N=ctx.N;
    for(let key=NOON;key<=DAWN;key++)smoothSky(w,key,ctx);
    w.noSignal=true; w.walkTop=118; w.roadTop=136;
    w.monasteryG=w.addGroup(18,30,'room');
    w.hallG=w.addGroup(18.2,29.8,'room');
    // Café and bookshop open into the evening; off again at both noons.
    w.cafeG=w.addGroup(17.6,25,'room');
    w.tramG=w.addGroup(12,40,'room');
    w.depth=0;
    for(let x=-40;x<360;x+=15)w.rect(x,94+Math.abs(x%8),14,24,M.FAR1);
    w.depth=2;
    drawSquare(w); drawJasnaGora(w); drawTownHall(w); drawAleje(w); drawProps(w,false);
    // Tram crossing at the Aleja Wolności/Kościuszki end, in front of the square.
    w.rect(-40,TRAM_Y-7,400,1,M.RAIL); w.rect(-40,TRAM_Y+1,400,1,M.RAIL);
    w.tramX=-96;
    w.cumulus=[{x:96,y:30,w:36,h:8,v:1.1},{x:262,y:50,w:22,h:4,v:.7},{x:-30,y:24,w:46,h:10,v:.9}];
    w.cat.x=217;w.cat.y=121;
    // The last three come out for the evening; the white habit is a Pauline father from the monastery.
    for(const [x,y,dir,speed,style,nightOnly] of [[20,FEET+1,1,5,'coat'],[87,FEET+2,-1,4,'shirt'],[150,FEET,1,5,'coat'],[221,FEET+2,-1,6,'shirt'],[290,FEET+1,1,4,'suit'],[120,FEET,-1,3,'habit'],
      [60,FEET+1,1,4,'pink',true],[200,FEET,-1,5,'blue',true],[335,FEET+2,-1,4,'coat',true]])w.peds.push({x,y,dir,speed,style,phase:x%3,nightOnly});
    Object.assign(w.personStyles,{coat:[M.COPPER_D,M.SUIT,M.HAIR],habit:[M.TRIM,M.TRIM,M.HAIR],cassock:[M.PAINT_K,M.PAINT_K,M.HAIR],
      blue:[M.SHIRT_B,M.COAT,M.HAIR],pink:[M.SHIRT_P,M.SUIT,M.TIMBER],sun:[M.POSTER_C,M.FGL,M.TIMBER_D]});
    // The pilgrims walk as ordinary pedestrians in step with each other; draw() takes them off the street at night.
    w.pilgrims=['blue','cassock','sun','pink','shirt','blue','sun'].map((style,i)=>({x:300+i*5,y:0,dir:-1,speed:3.5,style,phase:i}));
    w.peds.push(...w.pilgrims);
  };
  const draw=(w,dt,hour)=>{
    drawSky(w,dt,hour);
    // Groups reach the monastery by day. Feet on FEET+1 and FEET+2 keep the cross and the sign a row clear of the shop boards.
    const pilgrimage=hour<20.5||hour>30.5;
    for(const p of w.pilgrims)p.y=pilgrimage?FEET+2-p.phase%2:400;
    for (const [cx, cy] of [w.clockAt, w.monasteryClockAt]) {
      for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=16)w.tube(cx+dx,cy+dy,M.TRIM,N.LED_SOFT,w.hallG);
      for(const [angle,length] of [[(hour%1)*Math.PI*2-Math.PI/2,3],[(hour%12)/12*Math.PI*2-Math.PI/2,2]])line(cx,cy,cx+Math.round(Math.cos(angle)*length),cy+Math.round(Math.sin(angle)*length),(x,y)=>w.px(x,y,M.COPPER_D));
    }
    w.drawPeople(dt,hour);if(pilgrimage)drawPilgrimage(w);
    w.drawCat(dt,hour);drawProps(w,true,hour<25||hour>32.5);drawTram(w,dt);
  };
  CitySwitch.define('czestochowa-switch',{
    city:'Częstochowa',label:'Częstochowa day and night',
    tube:['#e45252','#75b5e3'],body:['#e9e6dd','#111f31'],glass:'clear',
    sky:SKY,grade,palette,build,draw,
    glyphs:{
      // One baseline for the 5-pixel sign letters and their Polish accents.
      K:['.....','.....','#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#','.....'],
      S:['.....','.....','.####','#....','#....','.###.','....#','....#','####.','.....'],
      I:['...','...','###','.#.','.#.','.#.','.#.','.#.','###','...'],
      Ą:['.....','.....','.###.','#...#','#...#','#####','#...#','#...#','#...#','...#.'],
      Ż:['..#..','.....','#####','....#','...#.','..#..','.#...','#....','#####','.....'],
      W:['#...#','#...#','#.#.#','#.#.#','.#.#.'],
    },
    street:(M)=>[M.PAVE,M.PAVE_D,M.STONE,M.STONE_D],
    weather:(h)=>({wet:.2*smooth(18.5,20,h)*(1-smooth(29,31,h))}),
    post:(w)=>w.reflect(),startle:(w)=>{w.cat.puff=1.4;},
  });
})();
