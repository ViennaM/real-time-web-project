const forms = document.querySelectorAll('form'),
  input = document.querySelector('#chat input'),
  button = document.querySelector('#chat button'),
  label = document.querySelector('#chat label'),
  messages = document.querySelector('.messages'),
  locWrapper = document.querySelector('article h2'),
  tempWrapper = document.querySelector('article h1'),
  descWrapper = document.querySelector('article h3'),
  iconWrapper = document.querySelector('article i'),
  userWrapper = document.querySelector('aside div p'),
  socket = io()
let username,
  position,
  temperature = document.querySelector('article h1').innerHTML.replace(/\D/g, ''),
  curLat,
  curLong,
  city,
  activeTab = true
let timestamps = []

iconWrapper.parentElement.classList.add('hidden')
getLocation()

function getLocation() {
  const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0
  }

  function success(pos) {
    var crd = pos.coords;
    curLat = crd.latitude
    curLong = crd.longitude
    getWeather(curLat, curLong)
  }

  function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`)
    curLat = 52.3702157
    curLong = 4.895167899999933
    getWeather(curLat, curLong)

  }
  navigator.geolocation.getCurrentPosition(success, error, options)
}

function getWeather(curLat, curLong) {
  const request = new XMLHttpRequest();
  request.open('GET', `https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="(${curLat}, ${curLong})") and u='c'&format=json`, true)

  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      // Success!
      let data = JSON.parse(request.responseText),
        loc = data.query.results.channel.location.city,
        temp = data.query.results.channel.item.condition.temp,
        desc = data.query.results.channel.item.condition.text,
        icon = data.query.results.channel.item.condition.code
      city = data.query.results.channel.location.city
      render(loc, temp, desc, icon)
      socket.emit('setLocation', loc)
    } else {
      render('Oops :(', '??', 'Try again later', '36')
    }
  }

  request.onerror = function () {
    // There was a connection error of some sort
    render('Oops :(', '??', 'Try again later', '36')
  }

  request.send()
}

function render(loc, temp, desc, icon) {
  iconWrapper.parentElement.classList.remove('hidden')
  locWrapper.innerHTML = loc
  tempWrapper.innerHTML = `${temp}°C`
  descWrapper.innerHTML = desc
  iconWrapper.classList.add(`wi-yahoo-${icon}`)
  if (temp > 16) {
    document.querySelector('main').classList.add('warm')
  }
}

forms.forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
  })
})


button.addEventListener('click', () => {
  send()
})

input.addEventListener('keypress', function (e) {
  var key = e.which || e.keyCode
  if (key === 13) {
    send()
  }
})

function send() {
  let now = timestamp()
  if (!username && input.value.replace(/<\/?[^>]+(>|$)/g, "") !== '' && input.value.length < 15) {
    username = input.value.replace(/<\/?[^>]+(>|$)/g, "")
    label.innerHTML = `${username}:`
    input.value = ''
    input.setAttribute('placeholder', 'TYPE YOUR MESSAGE')
    button.innerHTML = 'Send'
    label.classList.remove('hidden')
    socket.emit('setName', username)
  } else if (username && input.value.replace(/<\/?[^>]+(>|$)/g, "") !== '' && input.value.length < 80) {
    if (now - timestamps[timestamps.length - 1] > 1000 && now - timestamps[timestamps.length - 3] > 3000 || timestamps.length < 3) {
      socket.emit('chat', input.value)
      input.value = ''
    }
  }
}

  socket.on('chat', (curMsg) => {
    if (curMsg.location === city && activeTab) {
      let chat = `<div style="left:${curMsg.position}%"><span>${curMsg.username}: </span>${curMsg.message}</div>`
      messages.insertAdjacentHTML('beforeend', chat)
      messages.querySelectorAll('div').forEach((chat) => {
        chat.style.animationPlayState = "running"
      })
      let now = timestamp()
      timestamps.push(now)
    }
  })


window.addEventListener('focus', function () {
  activeTab = true
})

window.addEventListener('blur', function () {
  activeTab = false
})



socket.on('userUpdate', (count) => {
  userWrapper.innerHTML = count
})


function timestamp() {
  var d = new Date()
  var n = d.getTime()
  return n
}

// function moveUp(element) {
//   var i=0
//   function step() {
//      element.style.bottom=i+"%"
//      i++
//      if (i<=120) setTimeout(step,10);
//   }
//   step()
// }