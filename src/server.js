const http = require('http');

const socketio = require('socket.io');

const fs = require('fs'); // grab our file system

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;


// BIG BOI PROPERTIES
// some arbitrary random but big limit
const limit = Math.floor((Math.random() * 99) * 3) + 300;
const color = `rgb(${0}, ${0}, ${0})`;
const currentValue = 0;
// Multiplier increases as bigBoi reaches his limit. Gain more points for feeding him
const multiplier = 1;
// a bit redundant code, but i think its slightly neater


const users = {};

let gameIsActive = true;

const bigBoi = {
  bigLimit: limit,
  bigColor: color,
  bigCurrentValue: currentValue,
  bigMultiplier: multiplier,
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
      bigBoi.bigCurrentValue += data.scoreToAdd;
      users[data.name].score += data.scoreToAdd;

      // change the color if the boy getting big
      // only send update if the color has to change
      if (bigBoi.bigCurrentValue / bigBoi.bigLimit >= 0.9) {
        bigBoi.bigColor = `rgb(${220}, ${20}, ${60})`;
        bigBoi.bigMultiplier = 50;
        io.sockets.in('genericRoom').emit('updated', bigBoi);
      } else if (bigBoi.bigCurrentValue / bigBoi.bigLimit >= 0.5) {
        bigBoi.bigColor = `rgb(${139}, ${0}, ${0})`;
        bigBoi.bigMultiplier = 15;
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
        // update scores one last time
        io.sockets.in('genericRoom').emit('sendUserList', users);
        gameIsActive = false;
      }
    }
  });

  // Try to add new user to list
  socket.on('tryNewUser', (data) => {
    const nameToAdd = data;

    let userIsNew = true;
    // Check to see if user is in list already
    for (let inc = 0; inc < Object.keys(users).length; inc++) {
      if (Object.keys(users)[inc] === nameToAdd) {
        console.log('user ALRREADY IN HERE THO');
        userIsNew = false;
        // REJECT USER
        socket.emit('rejectUser');
      }
    }


    if (userIsNew) {
      // ADD USER
      const newUser = {
        name: nameToAdd,
        score: 0,
      };
      users[nameToAdd] = newUser;
      // sendListOfUsers
      io.sockets.in('genericRoom').emit('sendUserList', users);
      io.sockets.in('genericRoom').emit('acceptUser');
      console.log(users);
    }
  });

  socket.on('requestUsersUpdate', () => {
    socket.emit('sendUserList', users);
    console.log(users);
  });

  // when people leave, remove them from room
  socket.on('disconnect', () => {
    socket.leave('genericRoom');
  });
});


console.log(`listening on port ${PORT}`);
