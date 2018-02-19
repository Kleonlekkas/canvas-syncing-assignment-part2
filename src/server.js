const http = require('http');

const socketio = require('socket.io');

const fs = require('fs'); // grab our file system

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const limit = Math.floor((Math.random() * 99) * 3) + 300; // some arbitrary random but big ish limit
const color = `rgb(${0}, ${0}, ${0})`;
const currentValue = 0;

let gameIsActive = true;

const bigBoi = {
  bigLimit: limit,
  bigColor: color,
  bigCurrentValue: currentValue,
};

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
  // Create our room for everyone to join
  socket.join('genericRoom');

  socket.emit('updated', bigBoi);

  socket.on('feedBoi', (data) => {
    if (gameIsActive) {
      // Add the amount fed to the boys current value
      bigBoi.bigCurrentValue += data;

      // change the color if the boy getting big
      // only send update if the color has to change
      if (bigBoi.bigCurrentValue / bigBoi.bigLimit >= 0.9) {
        bigBoi.bigColor = `rgb(${220}, ${20}, ${60})`;
        io.sockets.in('genericRoom').emit('updated', bigBoi);
      } else if (bigBoi.bigCurrentValue / bigBoi.bigLimit >= 0.5) {
        bigBoi.bigColor = `rgb(${139}, ${0}, ${0})`;
        io.sockets.in('genericRoom').emit('updated', bigBoi);
      }

      // If the player is the one to exceed the limit
      if (bigBoi.bigCurrentValue >= bigBoi.bigLimit) {
        console.log('Player loses');
        bigBoi.bigColor = `rgb(${255}, ${0}, ${0})`;
        io.sockets.in('genericRoom').emit('updated', bigBoi);
        // Send to the player who triggered it
        socket.emit('lose');
        // Send to everyone else
        socket.to('genericRoom').emit('win');
        gameIsActive = false;
      }
    }
  });


  // when people leave, remove them from room
  socket.on('disconnect', () => {
    socket.leave('genericRoom');
  });
});


console.log(`listening on port ${PORT}`);
