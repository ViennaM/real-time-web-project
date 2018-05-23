const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const nunjucks = require('nunjucks')
const compression = require('compression')
const request = require('request')

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

const api = {
  handleData: function (data) {
    // return readable format
    const weather = {
      city: data.channel.location.city,
      temp: data.channel.item.condition.temp,
      desc: data.channel.item.condition.text,
      icon: data.channel.item.condition.code
    }
    return weather
  }
}
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
        client.username = username.replace(/<\/?[^>]+(>|$)/g, '')
      }
    })
    userCount++
    io.emit('userCount', userCount)
    io.emit('userList', clients)
  })
  socket.on('setLocation', function (location) {
    request(`https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="${location}") and u='c'&format=json`, function (error, response, body) {
      if (response.statusCode >= 200 && response.statusCode < 400) {
        let parsed = JSON.parse(body).query.results
        console.log(parsed.channel.location)
        if (parsed.channel.location) {
          let weather = api.handleData(parsed)
          socket.emit('weather', weather)
          clients.forEach((client) => {
            if (client.id === socket.id) {
              client.location = weather.city
              io.emit('userList', clients)
            }
          })
        } else {
          console.log('error: city not found')
          socket.emit('crash', 'notfound')
        }
      } else {
        console.log('error:', error, response.statusCode)
        socket.emit('crash', 'crash')
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
    clients.forEach((client) => {
      clients = clients.filter((client) => { // Remove socket.id from clients
        return client.id !== socket.id
      })
      if (client.id === socket.id && client.username) {
        userCount--
      }
    })
    io.emit('userCount', userCount)
    io.emit('userList', clients)
  })
})


http.listen(process.env.PORT || 8001, () => {
  console.log('Listening.. port 8001')
})
