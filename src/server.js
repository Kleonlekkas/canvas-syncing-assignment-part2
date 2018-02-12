const http = require('http');

const socketio = require('socket.io');

const fs = require('fs'); // grab our file system

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const draws = {};

const handler = (req, res) => {
  fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
    // if err, throw it for now
    if (err) {
      throw err;
    }

    res.writeHead(200);
    res.end(data);
  });
};

// create new server
const app = http.createServer(handler);

app.listen(PORT);

const io = socketio(app);


// create new socket server
io.on('connection', (socket) => {
  // Create our roomfor everyone to join
  socket.join('genericRoom');

  socket.emit('updated', draws);

  socket.on('makeSquares', (data) => {
    draws[new Date().getTime()] = data;

    // emit it to all clients now
    io.sockets.in('genericRoom').emit('updated', draws);
  });

  // when people leave, remove them from roomfor
  socket.on('disconnect', () => {
    socket.leave('genericRoom');
  });
});


console.log(`listening on port ${PORT}`);
