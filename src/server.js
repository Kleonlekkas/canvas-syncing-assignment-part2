const http = require('http');

const socketio = require('socket.io');

const fs = require('fs'); // grab our file system

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const boiImage = fs.readFileSync(`${__dirname}/../client/boiSpriteSheetSmaller.png`);

const cssStyle = fs.readFileSync(`${__dirname}/../client/mystyle.css`);


const users = {};

// BigBoi PROPERTIES
// limit is a randomly generated number which will determine the amount he can be fed.
// Multiplier increases the closer he is to his limit. Score more later in game
const bigBoi = {
  bigLimit: Math.floor((Math.random() * 99) * 50) + 10000,
  bigState: 0,
  bigCurrentValue: 0,
  bigMultiplier: 1,
};

const handler = (req, res) => {
  // load our img spritesheet
  if (req.url === '/boiSpriteSheetSmaller.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(boiImage);
  }
  if (req.url === '/mystyle.css') {
    res.writeHead(200);
    res.end(cssStyle);
  } else {
    fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
      // if err, throw it for now
      if (err) {
        throw err;
      }
      res.writeHead(200);
      res.end(data);
    });
  }
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
    // Add the amount fed to the boys current value
    bigBoi.bigCurrentValue += data.scoreToAdd;
    users[data.name] += (data.scoreToAdd * bigBoi.bigMultiplier);

    // change the sprite index if the boy is getting big
    // only send update if the color has to change
    if (bigBoi.bigCurrentValue / bigBoi.bigLimit >= 0.85) {
      bigBoi.bigState = 2; // Engorged state
      bigBoi.bigMultiplier = 50;
      io.sockets.in('genericRoom').emit('updated', bigBoi);
    } else if (bigBoi.bigCurrentValue / bigBoi.bigLimit >= 0.5) {
      bigBoi.bigState = 1;// kinda chubby state
      bigBoi.bigMultiplier = 15;
      io.sockets.in('genericRoom').emit('updated', bigBoi);
    }

    // If the player is the one to exceed the limit
    if (bigBoi.bigCurrentValue >= bigBoi.bigLimit) {
      // console.log('Player loses');
      bigBoi.bigState = 3;// dead state
      io.sockets.in('genericRoom').emit('updated', bigBoi);
      // Send to the player who triggered it
      socket.emit('lose');
      // and set their score to 0
      users[data.name] = 0;
      // Send to everyone else
      socket.to('genericRoom').emit('win');
      // update scores one last time
      io.sockets.in('genericRoom').emit('sendUserList', users);
    }
  });

  // Try to add new user to list
  socket.on('tryNewUser', (data) => {
    const nameToAdd = data;

    let userIsNew = true;
    // Check to see if user is in list already
    for (let inc = 0; inc < Object.keys(users).length; inc++) {
      if (Object.keys(users)[inc] === nameToAdd) {
        // console.log('user ALRREADY IN HERE THO');
        userIsNew = false;
        // REJECT USER
        socket.emit('rejectUser');
      }
    }


    if (userIsNew) {
      // ADD USER
      // Key will be the player name, and their value will be their score
      users[nameToAdd] = 0;
      // sendListOfUsers
      io.sockets.in('genericRoom').emit('sendUserList', users);
      // return name to the accept user emit
      io.sockets.in('genericRoom').emit('acceptUser', nameToAdd);
      // console.log(users);
      // also increase the limit a bit so it scales with users
      bigBoi.bigLimit += 5000;
    }
  });

  socket.on('requestUsersUpdate', () => {
    socket.emit('sendUserList', users);
    // console.log(users);
  });

  // when people leave, remove them from room
  socket.on('disconnect', () => {
    socket.leave('genericRoom');
  });
});


console.log(`listening on port ${PORT}`);
