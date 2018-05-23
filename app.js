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
  init: function () {

  },
  getWeather: function (location) {
    // get weather info from yahoo api
    
    

    // return new Promise((resolve, reject) => {
    //   const request = new XMLHttpRequest();
    //   request.open('GET', `https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="${location}") and u='c'&format=json`, true)
    //   request.onload = () => resolve(request.responseText)
    //   request.onerror = () => reject(request.statusText)
    //   request.send()
    // })

    // request.onload = function () {
    //   if (request.status >= 200 && request.status < 400) {
    //     // Success!
    //     this.handleData(JSON.parse(request.responseText.query.results.channel))

    //   } else {
    //     render('Oops :(', '??', 'Try again later', '36')
    //   }
    // }
    // request.onerror = function () {
    // There was a connection error of some sort
    // render('Oops :(', '??', 'Try again later', '36')
    // }

  },
  handleData: function (data) {    
    // return readable format
    let parsed = JSON.parse(data).query.results.channel
    const weather = {
      city: parsed.location.city,
      temp: parsed.item.condition.temp,
      desc: parsed.item.condition.text,
      icon: parsed.item.condition.code
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
      let weather = api.handleData(body)
      socket.emit('weather', weather)
      clients.forEach((client) => {
        if (client.id === socket.id) {
          client.location = weather.city
          io.emit('userList', clients)
        }
      })
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
