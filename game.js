// === Base Entity ===
class Entity {
  constructor(x, y, w, h, hp) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.hp = hp; this.maxHp = hp;
  }
  drawHp(ctx) {
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y - 8, this.w, 5);
    ctx.fillStyle = "lime";
    ctx.fillRect(this.x, this.y - 8, this.w * (this.hp / this.maxHp), 5);
  }
}

// === Player ===
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 32, 32, 100);
    this.speed = 3;
    this.damageBonus = 0;
    this.shootCooldown = 0;

    // cooldown skill
    this.cooldowns = { flick: 0, bomb: 0, reverse: 0 };
  }
  draw(ctx) {
    ctx.fillStyle = "cyan"; // nanti ganti sprite
    ctx.fillRect(this.x, this.y, this.w, this.h);
    this.drawHp(ctx);
  }
  move(keys, canvas) {
    if (keys["w"] && this.y > 0) this.y -= this.speed;
    if (keys["s"] && this.y + this.h < canvas.height) this.y += this.speed;
    if (keys["a"] && this.x > 0) this.x -= this.speed;
    if (keys["d"] && this.x + this.w < canvas.width) this.x += this.speed;
  }

  useFlick(canvas) {
    if (this.cooldowns.flick > 0) return;
    const amount = 80;
    const dir = Math.random() > 0.5 ? 1 : -1;
    this.x = Math.max(0, Math.min(canvas.width - this.w, this.x + amount * dir));
    this.cooldowns.flick = 180; // 3 detik
  }

  useBomb(game) {
    if (this.cooldowns.bomb > 0) return;
    for (let a = 0; a < 360; a += 20) {
      const rad = (a * Math.PI) / 180;
      game.bullets.push(new Bullet(
        this.x + this.w / 2,
        this.y + this.h / 2,
        Math.cos(rad),
        Math.sin(rad),
        5,
        "yellow",
        true,
        20
      ));
    }
    this.cooldowns.bomb = 600; // 10 detik
  }

  useReverse(game) {
    if (this.cooldowns.reverse > 0) return;
    game.bullets.forEach(b => {
      if (!b.fromPlayer && b.type === "normal") {
        b.fromPlayer = true;
        b.color = "cyan";
        b.dx *= -1;
        b.dy *= -1;
      }
    });
    this.cooldowns.reverse = 900; // 15 detik
  }
}

// === Bullet ===
class Bullet {
  constructor(x, y, dx, dy, speed, color, fromPlayer, dmg, type="normal") {
    this.x = x; this.y = y;
    this.dx = dx; this.dy = dy;
    this.speed = speed;
    this.color = color;
    this.fromPlayer = fromPlayer;
    this.dmg = dmg;
    this.size = 5;
    this.type = type;
    this.bounces = 3; // untuk bounce
  }
  update(canvas) {
    this.x += this.dx * this.speed;
    this.y += this.dy * this.speed;

    if (this.type === "bounce") {
      if (this.x <= 0 || this.x + this.size >= canvas.width) {
        this.dx *= -1; this.bounces--;
      }
      if (this.y <= 0 || this.y + this.size >= canvas.height) {
        this.dy *= -1; this.bounces--;
      }
    }
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
  isDead(canvas) {
    if (this.type === "bounce" && this.bounces <= 0) return true;
    return (
      this.x < 0 || this.y < 0 ||
      this.x > canvas.width || this.y > canvas.height
    );
  }
  collides(ent) {
    return (this.x < ent.x + ent.w &&
      this.x + this.size > ent.x &&
      this.y < ent.y + ent.h &&
      this.y + this.size > ent.y);
  }
}

// === Enemy ===
class Enemy extends Entity {
  constructor(x, y, hp, pattern) {
    super(x, y, 40, 40, hp);
    this.pattern = pattern;
    this.cooldown = 0;
  }
  draw(ctx) {
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    this.drawHp(ctx);
  }
  attack(game, player) {
    if (this.cooldown > 0) { this.cooldown--; return; }
    switch (this.pattern) {
      case "normal":
        game.spawnBullet(this.x, this.y, player.x, player.y, 3, false, 10);
        break;
      case "fan":
        for (let ang=-30; ang<=30; ang+=15)
          game.spawnBullet(this.x, this.y, player.x, player.y, 3, false, 10, ang);
        break;
      case "bomb":
        for (let a=0;a<360;a+=20) {
          let rad=a*Math.PI/180;
          game.bullets.push(new Bullet(this.x,this.y,Math.cos(rad),Math.sin(rad),2,"orange",false,12));
        }
        break;
      case "laser":
        game.bullets.push(new Bullet(this.x,this.y,0,1,8,"magenta",false,15,"laser"));
        break;
      case "bounce":
        let dx = (player.x - this.x)/100;
        let dy = (player.y - this.y)/100;
        game.bullets.push(new Bullet(this.x,this.y,dx,dy,4,"yellow",false,12,"bounce"));
        break;
    }
    this.cooldown = 60;
  }
}

// === Game Engine ===
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.keys = {}; this.mouse = {x:0,y:0,down:false};
    this.player = new Player(canvas.width/2, canvas.height-60);
    this.enemies = []; this.bullets=[];
    this.level=1; this.running=false;
    this.lastDamage=0;
    this.setupControls();
  }
  setupControls() {
    window.addEventListener("keydown", e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "q") this.player.useFlick(this.canvas);
      if (e.key.toLowerCase() === "e") this.player.useBomb(this);
      if (e.key.toLowerCase() === "r") this.player.useReverse(this);
    });
    window.addEventListener("keyup", e => this.keys[e.key.toLowerCase()] = false);
    this.canvas.addEventListener("mousemove", e => {
      const r=this.canvas.getBoundingClientRect();
      this.mouse.x=e.clientX-r.left; this.mouse.y=e.clientY-r.top;
    });
    this.canvas.addEventListener("mousedown",()=>this.mouse.down=true);
    this.canvas.addEventListener("mouseup",()=>this.mouse.down=false);
  }
  start() {
    this.level=1;
    this.player=new Player(this.canvas.width/2,this.canvas.height-60);
    this.loadLevel();
    this.running=true; this.loop();
  }
  loadLevel() {
    this.enemies=[];
    const hp=200+this.level*30;
    const types=["normal","fan","bomb","laser","bounce"];
    for(let i=0;i<Math.min(1+Math.floor(this.level/3),3);i++){
      let type=types[Math.floor(Math.random()*types.length)];
      this.enemies.push(new Enemy(this.canvas.width/2+(i*100-50),80,hp,type));
    }
  }
  update() {
    this.player.move(this.keys,this.canvas);
    if(this.player.shootCooldown>0) this.player.shootCooldown--;

    // skill cooldown tick
    Object.keys(this.player.cooldowns).forEach(k=>{
      if (this.player.cooldowns[k]>0) this.player.cooldowns[k]--;
    });

    if(this.mouse.down && this.player.shootCooldown===0){
      this.spawnBullet(this.player.x,this.player.y,this.mouse.x,this.mouse.y,6,true,6+this.player.damageBonus);
      this.player.shootCooldown=15;
    }
    this.enemies.forEach(e=>e.attack(this,this.player));
    for(let i=this.bullets.length-1;i>=0;i--){
      let b=this.bullets[i]; b.update(this.canvas);
      if(b.fromPlayer){
        this.enemies.forEach(en=>{
          if(b.collides(en)){ en.hp-=b.dmg; this.bullets.splice(i,1);}
        });
      } else {
        if(b.collides(this.player)){
          this.player.hp-=b.dmg; this.bullets.splice(i,1);
          this.lastDamage=Date.now();
        }
      }
      if(b.isDead(this.canvas)) this.bullets.splice(i,1);
    }
    if(Date.now()-this.lastDamage>2000 && this.player.hp<this.player.maxHp){
      this.player.hp+=0.1;
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
    if(this.enemies.length===0) this.nextLevel();
    if(this.player.hp<=0) this.end(false);
  }
  spawnBullet(x,y,tx,ty,speed,fromPlayer,dmg,angle=0){
    let dx=tx-x, dy=ty-y; let dist=Math.hypot(dx,dy);
    let base=Math.atan2(dy,dx)+angle*Math.PI/180;
    this.bullets.push(new Bullet(x,y,Math.cos(base),Math.sin(base),speed,fromPlayer?"cyan":"red",fromPlayer,dmg));
  }
  draw() {
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.player.draw(this.ctx);
    this.enemies.forEach(e=>e.draw(this.ctx));
    this.bullets.forEach(b=>b.draw(this.ctx));

    // HUD
    document.getElementById("hpBar").innerText=`HP: ${Math.floor(this.player.hp)}`;
    document.getElementById("levelText").innerText=`Level: ${this.level}`;

    // skill UI
    const skills = [
      {key:"Q", cd:this.player.cooldowns.flick, max:180},
      {key:"E", cd:this.player.cooldowns.bomb, max:600},
      {key:"R", cd:this.player.cooldowns.reverse, max:900},
    ];
    skills.forEach((s,i)=>{
      const x = 20 + i*50;
      const y = this.canvas.height - 50;
      this.ctx.fillStyle = "rgba(50,50,50,0.8)";
      this.ctx.fillRect(x,y,40,40);
      this.ctx.fillStyle = "white";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(s.key,x+12,y+25);
      if(s.cd>0){
        this.ctx.fillStyle = "rgba(0,0,0,0.6)";
        let h = 40*(s.cd/s.max);
        this.ctx.fillRect(x,y,40,h);
        this.ctx.fillStyle="yellow";
        this.ctx.font="12px Arial";
        this.ctx.fillText(Math.ceil(s.cd/60),x+12,y+15);
      }
    });
  }
  loop(){
    if(this.running){
      this.update(); this.draw();
      requestAnimationFrame(()=>this.loop());
    }
  }
  nextLevel(){
    this.level++;
    if(this.level>15){ this.end(true); return; }
    this.running=false;
    document.getElementById("upgradeScreen").style.display="block";
  }
  applyUpgrade(type){
    if(type==="hp"){this.player.maxHp+=20; this.player.hp+=20;}
    if(type==="damage") this.player.damageBonus+=2;
    if(type==="speed") this.player.speed+=1;
    document.getElementById("upgradeScreen").style.display="none";
    this.loadLevel(); this.running=true; this.loop();
  }
  end(win){
    this.running=false;
    document.getElementById("gameOverScreen").style.display="block";
    document.getElementById("gameOverText").textContent=win?"🎉 You Win!":"💀 Game Over";
  }
}

// === Init ===
let game;
window.onload=()=>{
  const canvas=document.getElementById("gameCanvas");
  game=new Game(canvas);
  document.getElementById("startBtn").onclick=()=>{
    document.getElementById("startScreen").style.display="none";
    game.start();
  };
  document.querySelectorAll(".upgrade").forEach(btn=>{
    btn.onclick=()=>game.applyUpgrade(btn.dataset.upgrade);
  });
  document.getElementById("restartBtn").onclick=()=>{
    document.getElementById("gameOverScreen").style.display="none";
    game=new Game(canvas); game.start();
  };
  document.getElementById("backBtn").onclick=()=>{
    document.getElementById("gameOverScreen").style.display="none";
    document.getElementById("startScreen").style.display="block";
  };
};
