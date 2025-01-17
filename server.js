const os = require('os');
const log = require('winston'); // error, warn, info, verbose, debug, silly

// Setup the environment.
const env = process.env.NODE_ENV;
const port = process.env.PORT;
const host = `${os.hostname()}:${port}`;
const express = require('express');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);

log.remove(log.transports.Console);
log.add(log.transports.Console, {colorize: true, timestamp: true});

// Game server code goes here....

server.lastPlayderID = 0;

server.listen(process.env.PORT || 8081, () => {
  log.info(`Listening on ${server.address().port}`);
});

app.use('/', express.static(`${__dirname}/dist`));

function getAllPlayers(socket) {
  const players = [];
  Object.keys(io.sockets.connected).forEach((socketID) => {
    if (socket === null || socket !== io.sockets.connected[socketID]) {
      const player = io.sockets.connected[socketID].player;
      if (player) {
        players.push(player);
      }
    }
  });
  return players;
}

function getAllPlayersMap(socket) {
  const players = {};
  Object.keys(io.sockets.connected).forEach((socketID) => {
    const player = io.sockets.connected[socketID].player;
    if (player) {
      if (socket === null || socket !== io.sockets.connected[socketID]) {
          players[player.id] = player;
      } else {
        players['me'] = player;
      }
    }
  });
  return players;
}

function sendAllPlayersToNewlyJoined(socket) {

  allOtherPlayers = getAllPlayers(socket);
  log.info("Sending 'allplayers': " + allOtherPlayers.map((p) => p.id));
  socket.emit('allplayers', allOtherPlayers);
}

function sendMyPlayer(socket) {

  log.info("Sending 'myPlayer': ", socket.player);
  socket.emit('myPlayer', socket.player);
}

function sendNewPlayerToExisting(socket) {

  log.info("Broadcasting 'newplayer': ", socket.player);
  socket.broadcast.emit('newplayer', socket.player);
}

function sendPlayerDisconnected(socket) {

  log.info("Emitting 'remove': ", socket.player.id);
  io.emit('remove', socket.player.id);
}

function sendPosition(socket, position) {

  //FIXME: this is Sir Spam-A-Lot
  log.info("Emitting 'position': ", position);
  socket.broadcast.emit('position', position);
}

function sendBomb(socket, bomb) {

  log.info("Emitting 'bomb': ", bomb);
  socket.broadcast.emit('bomb', bomb);
}

function sendDied(socket, player) {

  log.info("Emitting 'died': ", player);
  socket.broadcast.emit('playerDied', player);
}


function sendPlayers(socket) {

  players = getAllPlayersMap(socket);
  socket.emit('players', players);
}

function emitPlayers() {

  log.info("Emitting 'players'");
  Object.keys(io.sockets.connected).forEach((socketID) => {
    const socket = io.sockets.connected[socketID];
    sendPlayers(socket);
  });
}

function startGame(map) {

  log.info("Emitting 'gameStarted': ", map.name);
  io.emit('gameStarted', map);
}

function handleNewPlayer(socket) {

  log.info("handleNewPlayer");

  const playerId = server.lastPlayderID;
  server.lastPlayderID += 1;
  socket.player = {
    id: playerId,
    x: 96,
    y: 96,
  };

  // sendAllPlayersToNewlyJoined(socket);
  // sendMyPlayer(socket);
  // sendNewPlayerToExisting(socket);
  emitPlayers();

  socket.on('disconnect', () => {
    sendPlayerDisconnected(socket);
  });

  socket.on('position', (position) => {
    sendPosition(socket, {position: position, playerId: playerId});
  });

  socket.on('test', () => {
    log.warn('test received');
  });

  socket.on('bomb', (bomb) => {
    sendBomb(socket, bomb);
  });

  socket.on('playerGameOver', (player) => {
    sendDied(socket, player);
  });

  socket.on('startGame', (map) => {
    log.info('Received startGame ' + map.name);
    startGame(map);
  });
}

io.on('connection', (socket) => {
  log.info("Received 'connection'");

  socket.on('newplayer', () => {
    handleNewPlayer(socket);
  });

  socket.on('join', () => {
    handleNewPlayer(socket);
  });
});


// Log that the game server has started.
log.info(`Game server started at ${host} [${env}].`);
