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
      TIMBER: '#8b6c4d', TIMBER_D: '#5b4c3e', TREE: '#568164', TREE_D: '#355d4d',
      TREE_L: '#80a875', LEAF: '#73965e', PLANTER: '#737f78',
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
  const tree = (w, cx, cy, rw, rh, r) => {
    for (let y = -rh; y <= rh; y++) {
      for (let x = -rw; x <= rw; x++) {
        const d = (x * x) / (rw * rw) + (y * y) / (rh * rh);
        if (d > 1 + (r() - 0.5) * 0.3) continue;
        const v = r();
        let m = M.TREE;
        if (y > rh * 0.2 || x > rw * 0.4) m = v < 0.7 ? M.TREE_D : M.TREE;
        else if (y < -rh * 0.25 && x < rw * 0.2) m = v < 0.55 ? M.TREE_L : M.TREE;
        else if (v < 0.3) m = M.TREE_D;
        w.px(cx + x, cy + y, m);
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

  const drawSky = (w, dt, hour) => {
    const h = hour;
    if (h < 18.4) {
      const t = clamp((h - 12) / (18.1 - 12));
      const low = smooth(15.6, 17.4, h);
      w.sun(mix(118, 8, t), mix(16, 58, t * t * t), low > 0.3 ? 6 : 5, low);
    } else if (h > 29.2) {
      const t = clamp((h - 29.2) / (36 - 29.2));
      const low = 1 - smooth(30.2, 31.8, h);
      w.sun(mix(304, 118, t), mix(82, 16, Math.sqrt(t)), low > 0.3 ? 6 : 5, low);
    }
    if (h > 18.6 && h < 29.4) w.moon(mix(96, 142, (h - 18.6) / 10.8), mix(30, 18, Math.sin(((h - 18.6) / 10.8) * Math.PI)));
    for (const c of w.strata) {
      c.x += c.v * dt;
      if (c.x > 370) c.x = -c.w - 40;
      const cx = Math.round(c.x);
      for (let i = 0; i < c.w; i++) {
        const edge = Math.min(i, c.w - i);
        const thick = Math.round(Math.min(edge * 0.12, 1.5) + Math.sin(i * 0.17 + c.w) * 0.8 + 0.5);
        for (let j = -thick; j <= 0; j++) {
          if ((i + j * 3 + c.y) % 5 === 0 && edge < 18) continue;
          w.pxSky(cx + i, c.y + j, j === 0 ? M.CLOUD_SH : M.CLOUD);
        }
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

  const terrace = (w, x, y, umbrella) => {
    w.rect(x + 6, y - 9, 1, 12, M.CHAIR);
    for (let dx = -2; dx <= 14; dx++) {
      const top = y - 11 + Math.floor(Math.abs(dx - 6) / 4);
      w.rect(x + dx, top, 1, y - 7 - top, umbrella);
    }
    w.rect(x + 2, y, 9, 1, M.TIMBER);
    w.rect(x + 6, y + 1, 1, 4, M.CHAIR);
    for (const dx of [0, 12]) {
      w.rect(x + dx, y - 1, 1, 5, M.CHAIR);
      w.rect(x + dx - 1, y + 2, 3, 1, M.CHAIR);
    }
    w.px(x + 4, y - 1, M.TRIM);
    w.px(x + 8, y - 1, M.LABEL);
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
      w.lightRect(x, 85, 3, 5, N.WARM_DIM, w.monasteryG);
      w.rect(x, 94, 3, 5, M.FGL);
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
    for (const y of [37, 50, 66, 78]) w.rect(x - 9, y, 19, 2, M.TRIM);
    for (const y of [41, 54]) {
      w.rect(x - 3, y, 6, 8, M.FGL);
      w.rect(x - 1, y, 2, 8, M.CREAM_D);
    }
    w.monasteryClockAt = [x, 71];
    w.rect(x - 4, 26, 9, 11, M.COPPER_D);
    w.rect(x - 2, 28, 5, 7, M.TRIM);
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
    w.hsign(147, 113, 54, 7, 'PLAC BIEGANSKIEGO', { n: N.LED_SOFT, g: w.hallG, board: M.COPPER_D, off: M.TRIM, gap: 0 });
  };

  const drawAleje = (w) => {
    const blocks = [[218, 31, 75, M.TEN_Y], [249, 36, 65, M.TEN_P], [285, 36, 70, M.TEN_G], [321, 39, 79, M.CREAM]];
    for (const [x, width, top, wall] of blocks) {
      w.rect(x, top, width, 113 - top, wall);
      w.rect(x + width - 2, top, 2, 113 - top, M.CREAM_D);
      w.rect(x - 1, top - 2, width + 2, 3, M.TILE_D);
      w.rect(x, 94, width, 2, M.TRIM);
      for (let y = top + 6; y < 91; y += 13) for (let dx = 5; dx < width - 5; dx += 11) windowAt(w, x + dx, y, 5, 8, w.winGroups[(y + dx) % 28]);
      w.rect(x + 2, 99, width - 4, 13, M.FGL);
      w.lightRect(x + 3, 100, width - 6, 11, N.WARM, w.cafeG);
      for (let dx = 10; dx < width - 3; dx += 10) w.rect(x + dx, 99, 1, 13, M.COPPER_D);
    }
    w.hsign(250, 95, 34, 7, 'KAWIARNIA', { n: N.B_WHITE, g: w.cafeG, board: M.COPPER_D, off: M.TRIM, gap: 0 });
    w.hsign(287, 95, 32, 7, 'KSIAZKI', { n: N.LED_SOFT, g: w.cafeG, board: M.COPPER_D, off: M.TRIM });
    // A tree-lined pedestrian axis leads toward Jasna Góra through the gap.
    for (const [x, y, radius] of [[101, 104, 5], [116, 111, 7], [126, 120, 9], [81, 112, 7], [51, 122, 9]]) {
      w.rect(x, y - 8, 1, 13, M.TIMBER_D);
      tree(w, x, y - 14, radius, radius + 1, rng(x));
      w.rect(x - 4, y + 3, 9, 4, M.PLANTER);
      w.rect(x - 4, y + 3, 9, 1, M.LEAF);
    }
    for (const [x, y] of [[103, 109], [111, 118], [103, 132]]) {
      w.rect(x, y - 17, 1, 20, M.COPPER_D);
      w.rect(x - 3, y - 18, 7, 1, M.COPPER_D);
      w.lightRect(x - 2, y - 17, 5, 1, N.LED_SOFT, w.hallG);
    }
  };

  const drawTram = (w, dt) => {
    w.tramX += dt * 22;
    if (w.tramX > 380) w.tramX = -150;
    const x = Math.round(w.tramX), y = 145;
    for (let i = 0; i < 3; i++) {
      const sx = x + i * 28;
      w.rect(sx, y - 16, 26, 15, M.TRAM_W);
      w.rect(sx, y - 14, 26, 8, M.TRAM_GL);
      w.rect(sx, y - 6, 26, 4, M.TRAM_R);
      w.rect(sx, y - 2, 26, 2, M.TRAM_D);
      w.rect(sx + 3, y - 14, 1, 8, M.TRAM_W);
      w.rect(sx + 16, y - 14, 1, 8, M.TRAM_W);
      w.rect(sx + 17, y - 13, 6, 10, M.TRAM_GL);
      if (w.dark > .2) w.lightRect(sx + 5, y - 13, 10, 5, N.WARM_DIM, w.tramG);
      w.rect(sx + 5, y, 4, 1, M.TIRE);
      w.rect(sx + 19, y, 4, 1, M.TIRE);
      if (i < 2) w.rect(sx + 26, y - 14, 2, 13, M.COPPER_D);
    }
    // Sloping windscreen, low floor, destination display and raised pantograph.
    w.rect(x + 82, y - 14, 3, 12, M.TRAM_R);
    w.rect(x + 82, y - 13, 2, 7, M.TRAM_GL);
    w.rect(x + 83, y - 4, 2, 1, M.TRIM);
    if (w.dark > .2) w.pxLight(x + 84, y - 4, N.HEAD);
    w.rect(x + 60, y - 16, 14, 3, M.COPPER_D);
    w.lightRect(x + 62, y - 15, 9, 1, N.TRAM_LED, w.tramG);
    line(x + 35, y - 17, x + 42, y - 36, (px,py)=>w.px(px,py,M.COPPER_D));
    line(x + 42, y - 36, x + 49, y - 17, (px,py)=>w.px(px,py,M.COPPER_D));
    w.rect(x + 40, y - 38, 5, 1, M.COPPER_D);
  };

  const build = (w, ctx) => {
    M=ctx.M; N=ctx.N;
    for(let key=NOON;key<=DAWN;key++)smoothSky(w,key,ctx);
    w.noSignal=true; w.walkTop=118; w.roadTop=136;
    w.monasteryG=w.addGroup(18,30,'room');
    w.hallG=w.addGroup(18.2,29.8,'room');
    w.cafeG=w.addGroup(12,25,'room');
    w.tramG=w.addGroup(12,40,'room');
    w.depth=0;
    for(let x=-40;x<360;x+=15)w.rect(x,94+Math.abs(x%8),14,24,M.FAR1);
    w.depth=2;
    drawSquare(w); drawJasnaGora(w); drawTownHall(w); drawAleje(w);
    terrace(w,240,122,M.TRIM); terrace(w,276,122,M.COPPER); terrace(w,311,123,M.TRIM);
    // Tram crossing at the Aleja Wolności/Kościuszki end, in front of the square.
    w.rect(-40,138,400,1,M.RAIL); w.rect(-40,146,400,1,M.RAIL);
    w.rect(-40,107,400,1,M.WIRE);
    for(const x of [-12,343])w.rect(x,95,1,53,M.COPPER_D);
    w.tramX=-96;
    w.strata=[{x:-20,y:15,w:65,v:.6},{x:220,y:12,w:75,v:.4}];
    w.cat.x=217;w.cat.y=128;
    for(const [x,y,dir,speed,style] of [[20,123,1,5,'coat'],[87,129,-1,4,'shirt'],[150,129,1,5,'coat'],[221,125,-1,6,'shirt'],[290,128,1,4,'suit']])w.peds.push({x,y,dir,speed,style,phase:x%3});
    w.personStyles.coat=[M.COPPER_D,M.SUIT,M.HAIR];
  };
  const draw=(w,dt,hour)=>{
    drawSky(w,dt,hour);
    for (const [cx, cy] of [w.clockAt, w.monasteryClockAt]) {
      for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=16)w.tube(cx+dx,cy+dy,M.TRIM,N.LED_SOFT,w.hallG);
      for(const [angle,length] of [[(hour%1)*Math.PI*2-Math.PI/2,3],[(hour%12)/12*Math.PI*2-Math.PI/2,2]])line(cx,cy,cx+Math.round(Math.cos(angle)*length),cy+Math.round(Math.sin(angle)*length),(x,y)=>w.px(x,y,M.COPPER_D));
    }
    w.drawPeople(dt,hour);w.drawCat(dt,hour);drawTram(w,dt);
  };
  CitySwitch.define('czestochowa-switch',{
    city:'Częstochowa',label:'Częstochowa day and night',
    tube:['#e45252','#75b5e3'],body:['#e9e6dd','#111f31'],glass:'clear',
    sky:SKY,grade,palette,build,draw,
    glyphs:{W:['#...#','#...#','#.#.#','#.#.#','.#.#.']},
    street:(M)=>[M.PAVE,M.PAVE_D,M.STONE,M.STONE_D],
    weather:(h)=>({wet:.2*smooth(18.5,20,h)*(1-smooth(29,31,h))}),
    post:(w)=>w.reflect(),startle:(w)=>{w.cat.puff=1.4;},
  });
})();
