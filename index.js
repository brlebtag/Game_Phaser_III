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
    sendAll('play', cmd);
  });

  socket.on('register', function(name) {
    if (name in players) {
      socket.emit('register error');
    } else {
      let key;
      socket.player = name;
      players[name] = socket;
      socket.emit('register ok');
      for(key in players) {
        if (key != name) {
          socket.emit('play', createCommand(players[key].player));
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

function createCommand(player) {
  return {
    type: 'CREATE',
    player: player,
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