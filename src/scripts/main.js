(() => {
  const app = {
    init: function () {
      socket.init()
      app.elements.iconWrapper.parentElement.classList.add('hidden')
      app.elements.userList.classList.add('hidden')
      app.elements.suggestionWrapper.parentElement.classList.add('hidden')
      this.handleEvents()
    },
    handleEvents: function () {
      if (location.pathname.length > 1) {
        user.curLoc = location.pathname.substr(1)
        socket.io.emit('setLocation', user.curLoc)
      } else {
        user.getLocation()
      }

      app.elements.userBtn.addEventListener('click', () => {
        app.elements.userList.classList.toggle('hidden')
      })

      app.elements.locationInput.addEventListener('input', () => {
        if (app.elements.locationInput.value.length > 3) {
          api.getCities(app.elements.locationInput.value)
        }
      })

      app.elements.locationInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode
        if (key === 13) {
          window.history.pushState(app.elements.locationInput.value, app.elements.locationInput.value, app.elements.locationInput.value.replace(/ /g, '-').toLowerCase())
          socket.io.emit('setLocation', app.elements.locationInput.value)
          app.elements.locationInput.value = ''
        }
      })

      app.elements.forms.forEach((form) => {
        form.addEventListener('submit', (e) => {
          e.preventDefault()
          chat.submit()
        })
      })

      app.elements.button.addEventListener('click', () => {
        chat.submit()
      })

      window.addEventListener('focus', function () {
        user.activeTab = true
      })

      window.addEventListener('blur', function () {
        user.activeTab = false
      })
    },
    elements: {
      forms: document.querySelectorAll('form'),
      input: document.querySelector('#chat input'),
      button: document.querySelector('#chat button'),
      label: document.querySelector('#chat label'),
      messages: document.querySelector('.messages'),
      locWrapper: document.querySelector('article h2'),
      tempWrapper: document.querySelector('article h1'),
      descWrapper: document.querySelector('article h3'),
      iconWrapper: document.querySelector('article i'),
      userWrapper: document.querySelector('aside div p'),
      userBtn: document.querySelector('aside div'),
      userList: document.querySelector('#userlist'),
      suggestionWrapper: document.querySelector('#suggestions ul'),
      locationInput: document.querySelector('#location input')
    },
    renderWeather: function (weather) {
      app.elements.iconWrapper.parentElement.classList.remove('hidden')
      app.elements.locWrapper.innerHTML = weather.city
      app.elements.tempWrapper.innerHTML = `${weather.temp}°C`
      app.elements.descWrapper.innerHTML = weather.desc
      app.elements.iconWrapper.classList.remove(user.lastIcon)
      user.lastIcon = `wi-yahoo-${weather.icon}`
      app.elements.iconWrapper.classList.add(`wi-yahoo-${weather.icon}`)
      if (weather.temp > 16) {
        document.querySelector('main').classList.add('warm')
      } else if (document.querySelector('main').classList.contains('warm')) {
        document.querySelector('main').classList.remove('warm')
      }
    },
    renderSuggestions: function (cities) {
      app.elements.suggestionWrapper.innerHTML = ''
      app.elements.suggestionWrapper.parentElement.classList.remove('hidden')
      cities.geonames.forEach((city) => {
        app.elements.suggestionWrapper.innerHTML += `<li><a href="${city.toponymName}">${city.toponymName}</a></li>`
      })
      app.updateShortcuts()
    },
    updateShortcuts: function () {
      let shortcuts = document.querySelectorAll('section li a')
      shortcuts.forEach((a) => {
        a.addEventListener('click', (e) => {
          console.log(a.innerHTML)
          window.history.pushState(a.innerHTML, a.innerHTML, a.innerHTML.replace(/ /g, '-').toLowerCase())
          socket.io.emit('setLocation', a.innerHTML)
          app.elements.suggestionWrapper.parentElement.classList.add('hidden')
          app.elements.locationInput.value = ''
          e.preventDefault()
        })
      })
    }
  }
  const user = {
    activeTab: true,
    timestamps: [],
    setName: function () {
      this.name = app.elements.input.value.replace(/<\/?[^>]+(>|$)/g, "")
      app.elements.label.innerHTML = `${this.name}:`
      app.elements.input.value = ''
      app.elements.input.setAttribute('placeholder', 'TYPE YOUR MESSAGE')

      app.elements.button.innerHTML = 'Send'
      app.elements.label.classList.remove('hidden')
      socket.io.emit('setName', this.name)
    },
    getLocation: function () {
      const options = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0
      }

      function success(pos) {
        var crd = pos.coords;
        user.curLat = crd.latitude
        user.curLong = crd.longitude
        user.curLoc = `(${user.curLat}, ${user.curLong})`
        socket.io.emit('setLocation', user.curLoc)
      }

      function error(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`)
        user.curLat = 52.3702157
        user.curLong = 4.895167899999933
        user.curLoc = `(${user.curLat}, ${user.curLong})`
        socket.io.emit('setLocation', user.curLoc)
      }
      navigator.geolocation.getCurrentPosition(success, error, options)
    }
  }

  const chat = {
    submit: function () {
      if (!user.name && app.elements.input.value.replace(/<\/?[^>]+(>|$)/g, "") !== '' && app.elements.input.value.length < 15) {
        user.setName()
      } else if (user.name && app.elements.input.value.replace(/<\/?[^>]+(>|$)/g, "") !== '' && app.elements.input.value.length < 80) {
        chat.send()
      }
    },
    send: function () {
      let now = helper.timestamp()
      if (now - user.timestamps[user.timestamps.length - 1] > 1000 && now - user.timestamps[user.timestamps.length - 3] > 3000 || user.timestamps.length < 3) {
        socket.io.emit('chat', app.elements.input.value)
        app.elements.input.value = ''
      }
    },
    receive: function (curMsg) {
      if (curMsg.location === user.city && user.activeTab) {
        let chat = `<div style="left:${curMsg.position}%"><span>${curMsg.username}: </span>${curMsg.message}</div>`
        app.elements.messages.insertAdjacentHTML('beforeend', chat)
        app.elements.messages.querySelectorAll('div').forEach((chat) => {
          chat.style.animationPlayState = "running"
        })
        let now = helper.timestamp()
        user.timestamps.push(now)
      }
    }
  }

  const socket = {
    io: io(),
    init: function () {
      this.io.on('chat', (curMsg) => {
        chat.receive(curMsg)
      })
      this.io.on('weather', (weather) => {
        app.renderWeather(weather)
        user.city = weather.city
      })
      this.io.on('userCount', (count) => {
        app.elements.userWrapper.innerHTML = count
      })

      this.io.on('userList', (users) => {
        const usersWrapper = document.querySelector('section#userlist ul')
        usersWrapper.innerHTML = ''
        for (var i = 0; i < users.length; i++) {
          if (users[i].username && users[i].location) {
            usersWrapper.innerHTML += `<li>${users[i].username} (<a href="${users[i].location.toLowerCase()}">${users[i].location}</a>)</li>`
          }
        }
        app.updateShortcuts()
      })
    }
  }

  const api = {
    getCities: function (input) {
      const request = new XMLHttpRequest();
      request.open('GET', `http://api.geonames.org/search?name_startsWith=${input}&style=short&cities=cities1000&orderby=relevance&type=json&maxRows=5&username=vienna`, true)

      request.onload = function () {
        if (request.status >= 200 && request.status < 400) {
          // Success!
          let data = JSON.parse(request.responseText)
          if (data.geonames.length > 0) {
            app.renderSuggestions(data)
          }
        } else {
          console.log('error')
        }
      }

      request.onerror = function () {
        // There was a connection error of some sort
        console.log('error')
      }

      request.send()
    }
  }

  const helper = {
    timestamp: function() {
      var d = new Date()
      var n = d.getTime()
      return n
    }
  }






  app.init()
})()
