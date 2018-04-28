const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const nunjucks = require('nunjucks')
const request = require('request')
const compression = require('compression')

app.use(compression())
app.use(express.static(`${__dirname}/assets`))

nunjucks.configure('views', {
  autoescape: true,
  express: app
})

app.get('/', (req, res) => {
  res.render('index.html', {})
})

app.get('*', (req, res) => {
  res.render('index.html', {})
})

let clients = []
let userCount = 0

io.on('connection', function (socket) {
  io.emit('userCount', userCount)
  io.emit('userList', clients)
  clients.push({
    id: socket.id,
    username: '',
    location: '',
    position: Math.floor(Math.random() * 70)
  })
  socket.on('setName', function (username) {
    clients.forEach((client) => {
      if (client.id === socket.id) {
        client.username = username.replace(/<\/?[^>]+(>|$)/g, "")
      }
    })
    userCount++
    io.emit('userCount', userCount)
    io.emit('userList', clients)
  })
  socket.on('setLocation', function (location) {
    clients.forEach((client) => {
      if (client.id === socket.id) {
        client.location = location
      }
    })
    io.emit('userList', clients)
  })
  socket.on('chat', function (msg) {
    let curMsg = {
      message: msg.replace(/<\/?[^>]+(>|$)/g, ""),
      username: '',
      location: '',
      position: ''
    }
    clients.forEach((client) => {
      if (client.id === socket.id) {
        curMsg.username = client.username
        curMsg.location = client.location
        curMsg.position = client.position
      }
    })
    io.emit('chat', curMsg)
  })
  socket.on('disconnect', function () {
    clients.forEach((client)=> {
      if(client.id === socket.id && client.username) {
        userCount--
      }
    })
    clients = clients.filter((client) => { // Remove socket.id from clients
      return client !== socket.id
    })
    io.emit('userCount', userCount)
    io.emit('userList', clients)
  })
})


http.listen(process.env.PORT || 8001, () => {
  console.log('Listening.. port 8001')
})
