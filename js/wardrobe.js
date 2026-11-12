/* Одежда эпох: косметика, сохранение и общий атлас движений. */
const Wardrobe = (() => {
  const eras = { '80':'80-е', '90':'90-е', '00':'2000-е', '10':'2010-е', '20':'2020-е' };
  const rows = [
    ['80','После уроков','Хлопковая футболка, короткие спортивные шорты и парусиновые кеды.','Школьная сборная','Бордовая футболка с длинным рукавом, белые шорты, гетры и чёрные кожаные бутсы.'],
    ['90','Олимпийка со двора','Цветная олимпийка, свободные спортивные брюки и белые кроссовки.','Команда района','Свободная футболка с воротником, длинные шорты, гетры и бутсы с отворотом.'],
    ['00','Лето у гаражей','Свободная футболка, джинсовые шорты и массивные кроссовки.','Футбольная секция','Красная форма с боковыми вставками, чёрные гетры и красно-чёрные бутсы.'],
    ['10','После школы','Зелёное худи, зауженные спортивные брюки и низкие кеды.','Капитан коробки','Жёлтая техническая футболка, синие шорты, гетры и яркие лёгкие бутсы.'],
    ['20','Свой район','Свободная футболка, спортивные шорты, высокие носки и светлые кроссовки.','Вечерняя лига','Облегающая форма, высокие гетры и яркие бутсы с вязаным верхом.']
  ];
  const catalog = Object.fromEntries(rows.flatMap(([era,a,ad,b,bd]) => [
    {id:era+'-street',era,name:a,description:ad,style:'Дворовая одежда',price:0,row:0},
    {id:era+'-football',era,name:b,description:bd,style:'Футбольная форма',price:120,row:2}
  ]).map(item => [item.id,item]));
  const countries = {
    'Бразилия': 'br',
    'Китай': 'cn',
    'Индия': 'in'
  };
  const regional = [
    ['br','90','Соседи с холма','Терракотовая футболка, синие шорты и кроссовки.',
      'Вечерняя квадра','Золотая майка с зелёной окантовкой, синие шорты и бутсы для футзала.'],
    ['cn','00','После уроков в Гуанчжоу','Светлая футболка с тёмными манжетами, спортивные брюки и кроссовки.',
      'Районная команда Чэнду','Красная футболка со светлыми вставками, чёрные шорты и бутсы.'],
    ['in','00','После школы на майдане','Сливовая хлопковая футболка, тёмные шорты и синие кроссовки.',
      'Команда Калькутты','Голубая футболка с тёмными панелями, шорты и бутсы.']
  ];
  for (const [asset,era,street,streetDesc,kit,kitDesc] of regional) {
    const country = Object.keys(countries).find(name => countries[name] === asset);
    catalog[asset+'-street'] = {id:asset+'-street',era,country,asset,name:street,description:streetDesc,style:'Дворовая одежда',price:0,row:0};
    catalog[asset+'-football'] = {id:asset+'-football',era,country,asset,name:kit,description:kitDesc,style:'Футбольная форма',price:120,row:2};
  }
  const assets = new Map();
  const list = (era,country) => Object.values(catalog).filter(item => countries[country] ? item.country === country : !item.country && item.era === era);
  const owns = id => Object.hasOwn(catalog,id) && (Save.openCatalog || catalog[id].price === 0 || Save.data.ownedOutfits.includes(id));
  function selected(era,country) {
    if (Object.hasOwn(countries,country)) {
      const id = Save.data.outfitsByCountry?.[country];
      return catalog[id]?.country === country && owns(id) ? catalog[id] : catalog[countries[country]+'-street'];
    }
    const id = Save.data.outfitsByEra[era];
    return catalog[id]?.era === era && owns(id) ? catalog[id] : catalog[era+'-street'] || catalog['90-street'];
  }
  function equip(id) {
    if (!owns(id)) return false;
    const item = catalog[id];
    if (item.country) Save.data.outfitsByCountry[item.country] = id;
    else Save.data.outfitsByEra[item.era] = id;
    Save.save();
    return true;
  }
  function buy(id) {
    if (!Object.hasOwn(catalog,id)) return false;
    const item = catalog[id];
    if (!owns(id)) {
      if (Save.data.coins < item.price) return false;
      Save.data.coins -= item.price;
      Save.data.ownedOutfits.push(id);
    }
    return equip(id);
  }
  // Сервер принимает только известные комплекты эпохи сетевой площадки.
  function roomOutfit(id) { return catalog[id]?.era === '90' && !catalog[id].country ? id : '90-street'; }
  function shoeFrame(pixels,stride,x,y,w,h) {
    // Выбираем основной силуэт, чтобы в кадр не попал край соседней позы.
    const visited = new Uint8Array(w*h);
    const queue = new Int32Array(w*h);
    let best = null;
    function add(index) {
      if (visited[index]) return;
      visited[index] = 1;
      const at = ((y+Math.floor(index/w))*stride+x+index%w)*4+3;
      if (pixels[at] >= 144) queue[tail++] = index;
    }
    let tail = 0;
    for (let index=0; index<visited.length; index++) {
      tail = 0;
      add(index);
      if (!tail) continue;
      let left=w, right=0, top=h, bottom=0;
      for (let head=0; head<tail; head++) {
        const at = queue[head], col = at%w, row = Math.floor(at/w);
        left=Math.min(left,col); right=Math.max(right,col);
        top=Math.min(top,row); bottom=Math.max(bottom,row);
        if (col>0) add(at-1);
        if (col<w-1) add(at+1);
        if (row>0) add(at-w);
        if (row<h-1) add(at+w);
      }
      if (!best || tail>best.area) best={left,right,top,bottom,area:tail};
    }
    if (!best) return {x,y,w,h};
    const left = Math.max(0,best.left-2), top = Math.max(0,best.top-2);
    return {x:x+left,y:y+top,w:Math.min(w,best.right+3)-left,h:Math.min(h,best.bottom+3)-top};
  }
  function load(era, shoes = false) {
    const key = (shoes ? 'shoes-' : 'outfits-') + era;
    if (assets.has(key)) return assets.get(key);
    const asset = {image:new Image(), frames:null, failed:false};
    assets.set(key,asset);
    asset.image.addEventListener('load', () => {
      const image = asset.image, cw = image.naturalWidth/4, ch = image.naturalHeight/4;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(image,0,0);
      const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      asset.frames = Array.from({length:16}, (_,index) => {
        const sx = Math.round(index%4*cw), sy = Math.round(Math.floor(index/4)*ch);
        const ex = Math.round((index%4+1)*cw), ey = Math.round((Math.floor(index/4)+1)*ch);
        if (shoes || !Object.hasOwn(eras,era)) return shoeFrame(pixels,canvas.width,sx,sy,ex-sx,ey-sy);
        let left=ex, right=sx, top=ey, bottom=sy;
        for (let y=sy; y<ey; y++) for (let x=sx; x<ex; x++) {
          if (pixels[(y*canvas.width+x)*4+3] < 32) continue;
          left=Math.min(left,x); right=Math.max(right,x); top=Math.min(top,y); bottom=Math.max(bottom,y);
        }
        return right>=left ? {x:left,y:top,w:right-left+1,h:bottom-top+1} : {x:sx,y:sy,w:cw,h:ch};
      });
      window.dispatchEvent(new Event('wardrobe-ready'));
    });
    asset.image.addEventListener('error', () => {
      asset.failed=true; window.dispatchEvent(new Event('wardrobe-ready'));
    });
    asset.image.src = 'assets/' + key + '.webp?v=' + (!Object.hasOwn(eras,era) ? '21' : shoes ? '20' : '20261112-16');
    return asset;
  }
  function draw(ctx,x,y,size,id,pose,motion={}) {
    const item=catalog[id];
    if (!item) return false;
    const customShoes = motion.shoes && !item.country ? load(item.era,true) : null;
    const asset = customShoes?.frames ? customShoes : load(item.asset || item.era);
    if (!asset.frames) return false;
    const phase=Number.isFinite(motion.phase) ? motion.phase : performance.now()/240;
    const diving=pose==='keeper' && motion.dive;
    let frame=4;
    if (pose==='keeper') frame=diving ? 7 : 6;
    else if (motion.kick) frame=item.country ? 3 : 5;
    else if (motion.moving) {
      const stride = Math.floor(((phase/(Math.PI/2))%4+4)%4);
      frame = item.country ? 1 + stride % 2 : stride;
    }
    const f=asset.frames[item.row*4+frame], ref=asset.frames[item.row*4+4];
    const scale=150*size/ref.h;
    const w=f.w*scale, h=f.h*scale;
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(0,-2*size,diving ? 34*size : 20*size,6*size,0,0,Math.PI*2); ctx.fill();
    if (diving ? motion.dive<0 : motion.face===-1) ctx.scale(-1,1);
    const lift=diving ? 18*size : motion.moving ? Math.abs(Math.sin(phase))*1.5*size : 0;
    ctx.drawImage(asset.image,f.x,f.y,f.w,f.h,-w/2,-h-lift,w,h);
    ctx.restore();
    return true;
  }
  function drawFootwear(ctx,w,h,id,special) {
    const item = catalog[id];
    const asset = load(item.asset || item.era,special && !item.country);
    if (!asset.frames) return false;
    const frame = asset.frames[item.row*4+4];
    const crop = Math.round(frame.h*.23);
    const scale = Math.min(w*.72/frame.w,h*.72/crop);
    ctx.drawImage(asset.image,frame.x,frame.y+frame.h-crop,frame.w,crop,
      (w-frame.w*scale)/2,(h-crop*scale)/2,frame.w*scale,crop*scale);
    return true;
  }
  return {eras,countries,catalog,list,owns,selected,equip,buy,roomOutfit,load,draw,drawFootwear};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Wardrobe;
