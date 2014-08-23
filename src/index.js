// Here guys,
// The code you will read from here has been written in a weekend
// in the objective "Getting things done" ;-)
// Enjoy!
//
// Gaëtan Renaudeau | @greweb

var PIXI = require("pixi.js");
var requestAnimationFrame = require("raf");
var now = require("performance-now");
var smoothstep = require("smoothstep");
var BezierEasing = require("bezier-easing");

var map = require("./map.json");

// Utilities
function mix (a, b, v) {
  return a * (1-v) + b * v;
}
function step (a, b, v) {
  return Math.max(0, Math.min((v-a)/(b-a), 1));
}
function mixPosition (a, b, v) {
  return new PIXI.Point(mix(a.x, b.x, v), mix(a.y, b.y, v));
}
function distPosition (a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

// Rendering constants
var width = 960;
var height = 540;
var renderer = new PIXI.WebGLRenderer(width, height);
var $game = document.getElementById("game");
game.style.width = width+"px";
game.style.height = height+"px";
game.appendChild(renderer.view);

var gameStage = new PIXI.Stage();

var playerTexture = PIXI.Texture.fromImage("img/player.png");
var doorTexture = PIXI.Texture.fromImage("img/door.png");

var playerSpeed = 0.2;
var doorY = 320;
var doorSpacing = 120;
var doorStartX = (width - 2 * doorSpacing) / 2;

// States
var stage = gameStage;

var level = null;
var levelTime = null;

var playerMoveFrom = null;
var playerMoveTo = null;
var playerMoveDist = null;
var playerMoveStartTime = null;
var onPlayerMoved = null;

var bg = new PIXI.Sprite(PIXI.Texture.fromImage(map.levels[map.start].bg));

var objectsContainer = new PIXI.DisplayObjectContainer();
var itemsContainer = new PIXI.DisplayObjectContainer();
itemsContainer.position = new PIXI.Point(width - 4 * 32, height - 32);
var itemsBg = new PIXI.Sprite(PIXI.Texture.fromImage("img/items.png"));
itemsBg.position.x = -4;
itemsBg.position.y = -4;
var items = new PIXI.DisplayObjectContainer();
itemsContainer.addChild(itemsBg);
itemsContainer.addChild(items);

var cinematic = new PIXI.DisplayObjectContainer();
var title = new PIXI.Text("");
title.position.x = 10;
title.position.y = height - 50;
cinematic.addChild(title);

var doors = [ 0, 1, 2 ].map(function (i) {
  var sprite = new PIXI.Sprite(doorTexture);
  sprite.position.x = doorStartX + i * doorSpacing;
  sprite.position.y = doorY;
  sprite.anchor.x = 0.5;
  sprite.anchor.y = 1;
  sprite.interactive = true;
  sprite.buttonMode = true;
  sprite.defaultCursor = "pointer";
  sprite.touchstart = sprite.mousedown = function (e) {
    move(sprite.position, function () {
      onDoorClicked(i);
    });
  };
  return sprite;
});

var player = new PIXI.Sprite(playerTexture);
player.position.x = 300;
player.position.y = 450;
player.anchor.x = 0.5;
player.anchor.y = 1;

gameStage.addChild(bg);
doors.forEach(function (door) {
  gameStage.addChild(door);
});
gameStage.addChild(objectsContainer);
gameStage.addChild(player);
gameStage.addChild(itemsContainer);
gameStage.addChild(cinematic);

loadLevel(map.start);

// Functions

function loadLevel (l) {
  var current = level;
  var next = map.levels[l];
  if (!next) return;
  level = next;
  console.log("level", l, next);

  (next.doors||[null,null,null]).forEach(function (id, i) {
    var room = map.levels[id];
    if (id !== null && room) {
      // Predictively preload next rooms
      PIXI.Texture.fromImage(room.bg);
      doors[i].visible = true;
    }
    else {
      doors[i].visible = false;
    }
  });

  objectsContainer.children = [];
  (next.objects||[]).forEach(function (obj) {
    var spec = map.objects[obj.id];
    var sprite = new PIXI.Sprite(PIXI.Texture.fromImage(spec.img));
    obj.spec = spec;
    obj.sprite = sprite;
    sprite.spec = spec;
    sprite.obj = obj;
    if (spec.anchor) {
      sprite.anchor.x = spec.anchor.x;
      sprite.anchor.y = spec.anchor.y;
    }
    sprite.position = new PIXI.Point(obj.x, obj.y);
    sprite.interactive = true;
    sprite.buttonMode = true;
    sprite.touchstart = sprite.mousedown = function (e) {
      move(sprite.position, function () {
        onObjectClicked(obj);
      });
    };
    objectsContainer.addChild(sprite);
  });

  levelTime = now();
  bg.setTexture(PIXI.Texture.fromImage(next.bg));
  title.setText(next.title);

  if (next.timeout) {
    setTimeout(function () {
      if (next === level) {
        loadLevel(next.timeout.target);
      }
    }, next.timeout.delay);
  }
}

function removeFromMap (obj) {
  var i = level.objects.indexOf(obj);
  if (i === -1) return console.log("not found item:", obj);
  level.objects.splice(i, 1);
}

function addItem (obj) {
  var sprite = new PIXI.Sprite(PIXI.Texture.fromImage(obj.spec.thumb));
  sprite.obj = obj;
  sprite.position.x = 32 * items.children.length;
  sprite.position.y = 0;
  items.addChild(sprite);
}

function removeItem (i) {

}

function onDoorClicked (door) {
  if (level.doors && level.doors[door])
    loadLevel(level.doors[door]);
}

function onObjectClicked (obj) {
  if (obj.spec.t === "door") {
    loadLevel(obj.target);
  }
  else if (obj.spec.t === "item") {
    removeFromMap(obj);
    objectsContainer.removeChild(obj.sprite);
    addItem(obj);
  }
  else {
    console.log("Object click not handled:", obj);
  }
}

function gameOver () {
  setTimeout(function(){
    alert("Game Over");
    window.location.reload();
  }, 500);
}

function move (pos, cb) {
  playerMoveFrom = player.position;
  playerMoveTo = pos;
  onPlayerMoved = cb;
  playerMoveStartTime = now();
  playerMoveDist = distPosition(playerMoveFrom, playerMoveTo);
}

function update () {
  var p;
  if (playerMoveTo) {
    p = step(0, playerMoveDist / playerSpeed, now()-playerMoveStartTime);
    player.position = mixPosition(playerMoveFrom, playerMoveTo, p);
    if (p === 1) {
      onPlayerMoved && onPlayerMoved(playerMoveTo);
      playerMoveTo = null;
      playerMoveFrom = null;
      playerMoveStartTime = null;
    }
  }
}

// Events

gameStage.interactive = true;
gameStage.mousedown = gameStage.touchstart = function (e) {
  var x = e.global.x;
  var y = Math.max(doorY, e.global.y);
  move(new PIXI.Point(x, y));
};


(function renderLoop () {
  requestAnimationFrame(renderLoop);
  update();
  renderer.render(stage);
}());


