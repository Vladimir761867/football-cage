/* Единые размеры комнаты на всех экранах. */
const RoomField = (() => {
  const W = 520, H = 1120;
  const goal = { x:(W - H*.246)/2, y:H*.475, w:H*.246, h:H*.146 };
  const ball = { x:W/2, y:H*.82 };
  const quad = [[.17,.53],[.83,.53],[.97,.88],[.03,.88]].map(([x,y]) => ({x:x*W,y:y*H}));
  const places = [[.25,.75],[.75,.75],[.75,.25],[.25,.25]].map(([u,v]) => {
    const top = quad[0].x + (quad[1].x-quad[0].x)*u;
    const bottom = quad[3].x + (quad[2].x-quad[3].x)*u;
    return {x:top+(bottom-top)*v,y:H*(.53+(.88-.53)*v)};
  });
  return { W, H, goal, ball, quad, places, maxDrag:H*.5, shot:{ window:.21, spread:.26 } };
})();
if (typeof module !== 'undefined') module.exports = RoomField;
