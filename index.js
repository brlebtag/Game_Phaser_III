const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

var players = {};

io.on('connection', function(socket){
  console.log('a user was connected');

  socket.on('disconnect', function(){
    console.log('user was disconnected');
    if (socket.player) {
      sendAll('play', destroyCommand(socket.player));
      delete players[socket.player];
    }
    socket.player = undefined;
  });

  socket.on('play', function(cmd) {
    var socket = players[cmd.player];
    socket.x = cmd.x;
    socket.y = cmd.y;
    sendAll('play', cmd);
  });

  socket.on('register', function(name) {
    var player;

    if (name in players) {
      socket.emit('register error');
    } else {
      let key;
      socket.player = name;
      players[name] = socket;
      socket.emit('register ok');
      for(key in players) {
        player = players[key];
        if (key != name) {
          socket.emit('play', createCommand(player.player, player.x, player.y));
        }
      }
    }
  });
});

http.listen(3000, function () {
  console.log('http://localhost:3000/')
});

function destroyCommand(player) {
  return {
    type: 'DESTROY',
    player: player,
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

function sendAll(token, msg, except) {
  let socket;

  for(key in players) {
    socket = players[key];

    if (socket != except) {
      socket.emit(token, msg);
    }
  }
}