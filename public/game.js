var name;
var commands = [];
var players = {};
var platforms;
var cursors;
var game;
var socket;

$(function() {
  socket = io();
  startGame();
  
  socket.on('connect', function(){
    console.log('a user was connected');
    registerPlayer();
  });

  socket.on('register error', function(cmd) {
    registerPlayer();
  });

  socket.on('register ok', function(cmd) {
    sendCmd(createCommand(name, 32, game.world.height - 150));
  });

  socket.on('play', function(cmd) {
    pushCmd(cmd);
  });

  socket.on('disconnect', function() {
    console.log('a user was disconnected');
    pushCmd(destroyCommand(name));
  });
});

function registerPlayer() {
  name = prompt("Player's name:");
  socket.emit('register', name);
}

function startGame() {
  game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
};

function preload() {
  game.load.image('sky', './assets/sky.png');
  game.load.image('ground', './assets/platform.png');
  game.load.image('star', './assets/star.png');
  game.load.spritesheet('dude', './assets/dude.png', 32, 48);
}

function create() {
  game.physics.startSystem(Phaser.Physics.ARCADE);

  //  A simple background for our game
  game.add.sprite(0, 0, 'sky');

  createPlatforms();

  cursors = game.input.keyboard.createCursorKeys();
}

function createPlatforms() {
  //  The platforms group contains the ground and the 2 ledges we can jump on
  platforms = game.add.group();

  //  We will enable physics for any object that is created in this group
  platforms.enableBody = true;

  // Here we create the ground.
  var ground = platforms.create(0, game.world.height - 64, 'ground');

  //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
  ground.scale.setTo(2, 2);

  //  This stops it from falling away when you jump on it
  ground.body.immovable = true;

  //  Now let's create two ledges
  var ledge = platforms.create(400, 400, 'ground');

  ledge.body.immovable = true;

  ledge = platforms.create(-150, 250, 'ground');

  ledge.body.immovable = true;
}

function textMiddleWorld(text) {
  return (32.0 - (text.length * 6.5)) / 2.0;
}

function createPlayer(name, x, y) {
  console.log('player', name, 'was created!');
  players[name] = {};

  var character = players[name];

  // Add Players name
  var playerName = game.add.text(
    32 + textMiddleWorld(name), 
    game.world.height - 125, 
    name, {
      fontSize: 12,
      fontWeight: 700,
  });

  character.playerName = playerName;
  
  // The player and its settings
  var player = game.add.sprite(x, y, 'dude');

  //  We need to enable physics on the player
  game.physics.arcade.enable(player);

  //  Player physics properties. Give the little guy a slight bounce.
  player.body.bounce.y = 0.2;
  player.body.gravity.y = 300;
  player.body.collideWorldBounds = true;

  //  Our two animations, walking left and right.
  player.animations.add('left', [0, 1, 2, 3], 10, true);
  player.animations.add('right', [5, 6, 7, 8], 10, true);

  character.player = player;
}

function destroyPlayer(name) {
  var character = players[name];

  if (character) {
    character.playerName.destroy();
    character.player.destroy();
  }

  delete players[name];
}

function update() {
  keyboard();
  physics();
}

function keyboard() {
  if (!players[name]) return;

  var player = players[name].player;

  if (cursors.left.isDown) {
    if (cursors.up.isDown) {
      sendCmd(jumpLeftCommand(name, player.x, player.y));
    } else {
      sendCmd(moveLeftCommand(name, player.x, player.y));
    }
  } else if (cursors.right.isDown) {
    if (cursors.up.isDown) {
      sendCmd(jumpRightCommand(name, player.x, player.y));
    } else {
      sendCmd(moveRightCommand(name, player.x, player.y));
    }
  } else if (cursors.up.isDown) {
    sendCmd(jumpCommand(name, player.x, player.y));
  } else {
    sendCmd(stopCommand(name, player.x, player.y));
  }
}

function physics() {
  var player;
  var character;
  var i, cmd, playerName;

  applyCollision();

  for(i = 0; i<commands.length; i++) {
    cmd = commands[i];

    if (cmd.type == 'CREATE') {
      createPlayer(cmd.player, cmd.x, cmd.y);
      continue;
    } else if (cmd.type == 'DESTROY') {
      destroyPlayer(cmd.player);
      continue;
    }

    character = players[cmd.player];
    player = character.player;
    playerName = character.playerName;

    //  Reset the players velocity (movement)
    player.body.velocity.x = 0;

    switch (cmd.type) {
      case 'STOP':
        stopPlayer(player);
      break;
      case 'MOV_LEFT':
        moveLeftPlayer(player);
      break;
      case 'MOV_RIGHT':
        moveRightPlayer(player);
      break;
      case 'JUMP':
        jumpPlayer(player, character);
      break;
      case 'JUMP_RIGHT':
        moveRightPlayer(player);
        jumpPlayer(player, character);
      break;
      case 'JUMP_LEFT':
        moveLeftPlayer(player);
        jumpPlayer(player, character);
      break;
    }

    playerName.x = player.x + textMiddleWorld(playerName.text);
    playerName.y = player.y - 15;
  }

  cleanCmd();
}

function stopPlayer(player) {
  //  Stand still
  player.animations.stop();

  player.frame = 4;
}

function moveLeftPlayer(player) {
  //  Move to the left
  player.body.velocity.x = -150;

  player.animations.play('left');
}

function moveRightPlayer(player) {
  //  Move to the right
  player.body.velocity.x = 150;

  player.animations.play('right');
}

function jumpPlayer(player, character) {
  //  Allow the player to jump if they are touching the ground.
  if (player.body.touching.down && character.hitPlatform) {
    player.body.velocity.y = -350;
  }
}

function applyCollision() {
  var k1, k2, character, player, character2, hitPlatform;

  for(k1 in players) {
    character = players[k1];
    player = character.player;
    hitPlatform = game.physics.arcade.collide(player, platforms);

    for(k2 in players) {
      if (k1 == k2) continue;
      character2 = players[k2];
      hitPlatform |= game.physics.arcade.collide(player, character2.player);
    }

    character.hitPlatform = hitPlatform
  }
}

function stopCommand(player, x, y) {
  return {
    type: 'STOP',
    player: player,
    x: x,
    y: y,
  };
}

function moveLeftCommand(player, x, y) {
  return {
    type: 'MOV_LEFT',
    player: player,
    x: x,
    y: y,
  };
}

function moveRightCommand(player, x, y) {
  return {
    type: 'MOV_RIGHT',
    player: player,
    x: x,
    y: y,
  };
}

function jumpCommand(player, x, y) {
  return {
    type: 'JUMP',
    player: player,
    x: x,
    y: y,
  };
}

function jumpRightCommand(player, x, y) {
  return {
    type: 'JUMP_RIGHT',
    player: player,
    x: x,
    y: y,
  };
}

function jumpLeftCommand(player, x, y) {
  return {
    type: 'JUMP_LEFT',
    player: player,
    x: x,
    y: y,
  };
}

function createCommand(player, x, y) {
  return {
    type: 'CREATE',
    player: player,
    x: x,
    y: y,
  };
}

function destroyCommand(player) {
  return {
    type: 'DESTROY',
    player: player,
  };
}

function pushCmd(cmd) {
  commands.push(cmd);
}

function popCmd() {
  return commands.shift();
}

function cleanCmd() {
  commands = [];
}

function sendCmd(cmd) {
  socket.emit('play', cmd);
}