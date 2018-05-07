'use strict';

(function () {
  var forms = document.querySelectorAll('form'),
      input = document.querySelector('#chat input'),
      button = document.querySelector('#chat button'),
      label = document.querySelector('#chat label'),
      messages = document.querySelector('.messages'),
      locWrapper = document.querySelector('article h2'),
      tempWrapper = document.querySelector('article h1'),
      descWrapper = document.querySelector('article h3'),
      iconWrapper = document.querySelector('article i'),
      userWrapper = document.querySelector('aside div p'),
      userBtn = document.querySelector('aside div'),
      userList = document.querySelector('#userlist'),
      suggestionWrapper = document.querySelector('#suggestions ul'),
      socket = io();
  var username = void 0,
      position = void 0,
      temperature = document.querySelector('article h1').innerHTML.replace(/\D/g, ''),
      curLat = void 0,
      curLong = void 0,
      curLoc = void 0,
      lastIcon = void 0,
      city = void 0,
      activeTab = true;
  var timestamps = [];

  iconWrapper.parentElement.classList.add('hidden');
  userList.classList.add('hidden');
  suggestionWrapper.parentElement.classList.add('hidden');
  userBtn.addEventListener('click', function () {
    userList.classList.toggle('hidden');
  });
  var locationInput = document.querySelector('#location input');

  locationInput.addEventListener('input', function () {
    if (locationInput.value.length > 3) {
      getCities(locationInput.value);
    }
  });
  locationInput.addEventListener('keypress', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) {
      window.history.pushState(locationInput.value, locationInput.value, locationInput.value.replace(/ /g, '-').toLowerCase());
      getWeather(locationInput.value);
      locationInput.value = '';
    }
  });

  if (location.pathname.length > 1) {
    curLoc = location.pathname.substr(1);
    getWeather(curLoc);
  } else {
    var getLocation = function getLocation() {
      var options = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0
      };

      function success(pos) {
        var crd = pos.coords;
        curLat = crd.latitude;
        curLong = crd.longitude;
        curLoc = '(' + curLat + ', ' + curLong + ')';
        getWeather(curLoc);
      }

      function error(err) {
        console.warn('ERROR(' + err.code + '): ' + err.message);
        curLat = 52.3702157;
        curLong = 4.895167899999933;
        curLoc = '(' + curLat + ', ' + curLong + ')';
        getWeather(curLoc);
      }
      navigator.geolocation.getCurrentPosition(success, error, options);
    };

    getLocation();
  }

  function getWeather(curLoc) {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="' + curLoc + '") and u=\'c\'&format=json', true);

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        var data = JSON.parse(request.responseText),
            loc = data.query.results.channel.location.city,
            temp = data.query.results.channel.item.condition.temp,
            desc = data.query.results.channel.item.condition.text,
            icon = data.query.results.channel.item.condition.code;
        city = data.query.results.channel.location.city;
        render(loc, temp, desc, icon);
        socket.emit('setLocation', loc);
        suggestionWrapper.innerHTML = '';
        suggestionWrapper.parentElement.classList.add('hidden');
        locationInput.value = '';
      } else {
        render('Oops :(', '??', 'Try again later', '36');
      }
    };

    request.onerror = function () {
      // There was a connection error of some sort
      render('Oops :(', '??', 'Try again later', '36');
    };

    request.send();
  }

  function getCities(input) {
    var request = new XMLHttpRequest();
    request.open('GET', 'http://api.geonames.org/search?name_startsWith=' + input + '&style=short&cities=cities1000&orderby=relevance&type=json&maxRows=5&username=vienna', true);

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        var data = JSON.parse(request.responseText);
        if (data.geonames.length > 0) {
          console.log(data);
          renderSuggestions(data);
        }
      } else {
        // render('Oops :(', '??', 'Try again later', '36')
        console.log('error');
      }
    };

    request.onerror = function () {
      // There was a connection error of some sort
      // render('Oops :(', '??', 'Try again later', '36')
      console.log('error');
    };

    request.send();
  }

  function render(loc, temp, desc, icon) {
    iconWrapper.parentElement.classList.remove('hidden');
    locWrapper.innerHTML = loc;
    tempWrapper.innerHTML = temp + '\xB0C';
    descWrapper.innerHTML = desc;
    iconWrapper.classList.remove(lastIcon);
    lastIcon = 'wi-yahoo-' + icon;
    iconWrapper.classList.add('wi-yahoo-' + icon);
    if (temp > 16) {
      document.querySelector('main').classList.add('warm');
    } else if (document.querySelector('main').classList.contains('warm')) {
      document.querySelector('main').classList.remove('warm');
    }
  }

  function renderSuggestions(cities) {
    suggestionWrapper.innerHTML = '';
    suggestionWrapper.parentElement.classList.remove('hidden');
    cities.geonames.forEach(function (city) {
      suggestionWrapper.innerHTML += '<li><a href="' + city.toponymName + '">' + city.toponymName + '</a></li>';
    });
    updateShortcuts();
  }

  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
    });
  });

  button.addEventListener('click', function () {
    send();
  });

  input.addEventListener('keypress', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) {
      send();
    }
  });

  function send() {
    var now = timestamp();
    if (!username && input.value.replace(/<\/?[^>]+(>|$)/g, "") !== '' && input.value.length < 15) {
      username = input.value.replace(/<\/?[^>]+(>|$)/g, "");
      label.innerHTML = username + ':';
      input.value = '';
      input.setAttribute('placeholder', 'TYPE YOUR MESSAGE');
      button.innerHTML = 'Send';
      label.classList.remove('hidden');
      socket.emit('setName', username);
    } else if (username && input.value.replace(/<\/?[^>]+(>|$)/g, "") !== '' && input.value.length < 80) {
      if (now - timestamps[timestamps.length - 1] > 1000 && now - timestamps[timestamps.length - 3] > 3000 || timestamps.length < 3) {
        socket.emit('chat', input.value);
        input.value = '';
      }
    }
  }

  socket.on('chat', function (curMsg) {
    if (curMsg.location === city && activeTab) {
      var chat = '<div style="left:' + curMsg.position + '%"><span>' + curMsg.username + ': </span>' + curMsg.message + '</div>';
      messages.insertAdjacentHTML('beforeend', chat);
      messages.querySelectorAll('div').forEach(function (chat) {
        chat.style.animationPlayState = "running";
      });
      var now = timestamp();
      timestamps.push(now);
    }
  });

  window.addEventListener('focus', function () {
    activeTab = true;
  });

  window.addEventListener('blur', function () {
    activeTab = false;
  });

  socket.on('userCount', function (count) {
    userWrapper.innerHTML = count;
  });

  socket.on('userList', function (users) {
    var usersWrapper = document.querySelector('section#userlist ul');
    usersWrapper.innerHTML = '';
    for (var i = 0; i < users.length; i++) {
      if (users[i].username && users[i].location) {
        usersWrapper.innerHTML += '<li>' + users[i].username + ' (<a href="' + users[i].location.toLowerCase() + '">' + users[i].location + '</a>)</li>';
      }
    }

    updateShortcuts();
  });

  function updateShortcuts() {
    var shortcuts = document.querySelectorAll('section li a');
    shortcuts.forEach(function (a) {
      a.addEventListener('click', function (e) {
        window.history.pushState(a.innerHTML, a.innerHTML, a.innerHTML.replace(/ /g, '-').toLowerCase());
        getWeather(a.innerHTML);
        e.preventDefault();
      });
    });
  }

  function timestamp() {
    var d = new Date();
    var n = d.getTime();
    return n;
  }
})();