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
  const assets = new Map();
  const list = era => Object.values(catalog).filter(item => item.era === era);
  const owns = id => !!catalog[id] && (catalog[id].price === 0 || Save.data.ownedOutfits.includes(id));
  function selected(era) {
    const id = Save.data.outfitsByEra[era];
    return catalog[id]?.era === era && owns(id) ? catalog[id] : catalog[era+'-street'] || catalog['90-street'];
  }
  function equip(id) {
    if (!owns(id)) return false;
    Save.data.outfitsByEra[catalog[id].era] = id;
    Save.save();
    return true;
  }
  function buy(id) {
    const item = catalog[id];
    if (!item) return false;
    if (!owns(id)) {
      if (Save.data.coins < item.price) return false;
      Save.data.coins -= item.price;
      Save.data.ownedOutfits.push(id);
    }
    return equip(id);
  }
  // Сервер принимает только известные комплекты эпохи сетевой площадки.
  function roomOutfit(id) { return catalog[id]?.era === '90' ? id : '90-street'; }
  function load(era) {
    if (assets.has(era)) return assets.get(era);
    const asset = {image:new Image(), frames:null, failed:false};
    assets.set(era,asset);
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
    asset.image.src='assets/outfits-'+era+'.webp?v=20261112-16';
    return asset;
  }
  function draw(ctx,x,y,size,id,pose,motion={}) {
    const item=catalog[id];
    if (!item) return false;
    const asset=load(item.era);
    if (!asset.frames) return false;
    const phase=Number.isFinite(motion.phase) ? motion.phase : performance.now()/240;
    const diving=pose==='keeper' && motion.dive;
    let frame=4;
    if (pose==='keeper') frame=diving ? 7 : 6;
    else if (motion.kick) frame=5;
    else if (motion.moving) frame=Math.floor(((phase/(Math.PI/2))%4+4)%4);
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
  return {eras,catalog,list,owns,selected,equip,buy,roomOutfit,load,draw};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Wardrobe;
