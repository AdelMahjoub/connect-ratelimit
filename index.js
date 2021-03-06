var clients   = {},
    whitelist,
    blacklist,
    end       = false,
    config    = {
      whitelist: {
        totalRequests: -1,
        every:         60 * 60 * 1000
      },
      blacklist: {
        totalRequests: 0,
        every:         60 * 60 * 1000 
      },
      normal: {
        totalRequests: 500,
        every:         60 * 60 * 1000
      }
    };


module.exports = function (options) {
  var categories;

  if (!options){
    options = {};
  }

  whitelist   = options.whitelist || [];
  blacklist   = options.blacklist || [];
  end         = options.end       || end;

  categories = options.categories || options.catagories; 
  if (categories){
    deepExtend(config, categories);
  }

  return middleware;
};

function middleware (req, res, next) {
  var name   = req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      type   = getClientType(name),
      client = clients[name];

  res.ratelimit = {
    clients: clients,
    exceeded: false
  };

  if (req.url === '/favicon.ico') {
    next();
    return;
  };

  if (!client) {
    clients[name] = client = new Client(name, type, config[type].every);
  }  

  res.setHeader('X-RateLimit-Limit', config[type].totalRequests);
  res.setHeader('X-RateLimit-Remaining', config[type].totalRequests - client.visits);

  res.ratelimit.exceeded = !ok(client);
  res.ratelimit.client   = client;


  if (ok(client)) {
    client.visits++;
    next();
  } 
  else if (end === false) {
    next();
  }
  else {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 429;
    res.end('{"error":"Rate limit exceded."}');
  }
}

function Client (name, type, resetIn) {
  var name   = name;

  this.name  = name;
  this.type  = type;
  this.visits = 1;

  setTimeout(function () {
    delete clients[name];
  }, resetIn);
}

function ok (client) {
  if (config[client.type].totalRequests === -1) {
    return true;
  } else {
    return client.visits <= config[client.type].totalRequests;
  }
}

function getClientType (name) {
  if (whitelist.indexOf(name) > -1) {
    return 'whitelist';
  }
  if (blacklist.indexOf(name) > -1) {
    return 'blacklist';
  }
  return 'normal';
}

function deepExtend (destination, source) {
  var property;
  
  for (property in source) {
    if (source[property] && source[property].constructor &&
     source[property].constructor === Object) {
      destination[property] = destination[property] || {};
      deepExtend(destination[property], source[property]);
    } else {
      destination[property] = source[property];
    }
  }
  return destination;
}
