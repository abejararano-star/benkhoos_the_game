const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// A complete step is driven by world distance, rather than by frame rate or stale vx.
export class GaitClock {
  constructor(){this.actors=new WeakMap();}
  sample(actor,time){
    const x=Number(actor.x)||0;
    let gait=this.actors.get(actor);
    if(!gait||time<gait.time){gait={x,time,phase:0,moving:false,speed:0};this.actors.set(actor,gait);return gait;}
    const dt=time-gait.time;
    if(dt<=0)return gait;
    const dx=x-gait.x,distance=Math.abs(dx);
    if(distance>Math.max(100,dt*500)){gait.phase=0;gait.moving=false;gait.speed=0;}
    else{
      gait.speed=distance/dt;gait.moving=gait.speed>2;
      if(gait.moving){
        const stride=gait.speed>115?52:36;
        const backwards=Math.sign(dx)!==(actor.facing||Math.sign(dx));
        gait.phase=((gait.phase+distance/stride*(backwards?-1:1))%1+1)%1;
      }
    }
    gait.x=x;gait.time=time;return gait;
  }
}

// Render interpolation never changes gameplay positions, collisions or saved state.
export class RenderInterpolation {
  constructor(){this.previous=new WeakMap();this.camera=0;this.initialized=false;}
  capture(state){
    this.camera=state.cameraX;this.initialized=true;
    for(const item of [state.benkos,...state.units,...state.enemies,...state.messengers,...state.wildlife,...state.droppedCoins,...state.projectiles,...state.particles]){
      let p=this.previous.get(item);if(!p){p={};this.previous.set(item,p);}p.x=item.x;p.y=item.y;
    }
  }
  value(item,key,alpha){
    const current=item[key],old=this.previous.get(item)?.[key];
    if(!Number.isFinite(old)||!Number.isFinite(current)||Math.abs(current-old)>100)return current;
    return old+(current-old)*clamp(alpha,0,1);
  }
  cameraX(state,alpha){return this.initialized&&Math.abs(state.cameraX-this.camera)<100?this.camera+(state.cameraX-this.camera)*clamp(alpha,0,1):state.cameraX;}
}

export function pixelViewport(width,height){
  const scale=Math.max(1,Math.round(Math.min(width/420,height/255)));
  const logicalWidth=Math.floor(width/scale),logicalHeight=Math.floor(height/scale);
  return {width:logicalWidth,height:logicalHeight,waterLine:Math.round(logicalHeight*.81),scale};
}
