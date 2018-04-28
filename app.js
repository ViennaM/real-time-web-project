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

let clients = []
let userCount = 0

io.on('connection', function (socket) {
  userCount++
  io.emit('userUpdate', userCount)
  clients.push({
    id: socket.id,
    username: '',
    location: '',
    position: Math.floor(Math.random() * 70)
  }) 
  socket.on('setName', function (username) {
    clients.forEach((c) => {
      if (c.id === socket.id) {
        c.username = username.replace(/<\/?[^>]+(>|$)/g, "")
      }
    })
  })
  socket.on('setLocation', function (location) {
    clients.forEach((c) => {
      if (c.id === socket.id) {
        c.location = location
      }
    })
  })
  socket.on('chat', function (msg) {
    let curMsg = {
      message: msg.replace(/<\/?[^>]+(>|$)/g, ""),
      username: '',
      location: '',
      position: ''
    }
    clients.forEach((c) => {
      if (c.id === socket.id) {
        curMsg.username = c.username
        curMsg.location = c.location
        curMsg.position = c.position
      }
    })
    io.emit('chat', curMsg)
  })
  socket.on('disconnect', function () {
    userCount--
    io.emit('userUpdate', userCount)
    clients = clients.filter((c) => { // Remove socket.id from clients
      return c !== socket.id
    })
  })
})


http.listen(process.env.PORT ||  8001, () => {
  console.log('Listening.. port 8001')
})
