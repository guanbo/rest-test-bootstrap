'use strict';

const superagent = require('superagent'),
  fs = require('fs'),
  path = require('path'),
  formstream = require('formstream')

let server;

class Request {
  constructor(options) {
    this.prefix = require('superagent-prefix')(options.stream || 'http://0.0.0.0:3000');
    this.credential = options.credential || {
      username: 'weixin.oV5Yms7LX0RPudwkz1X6G2Kilj9w',
      password: '123456',
    };
    this.userModel = options.userModel || 'users';
    this.tokenKey = options.tokenKey || 'id';
    this.accessToken = null;
  }

  setAuthorization(req) {
    let token = this.accessToken && this.accessToken[this.tokenKey];
    if (token) req.set({ 'Authorization': token });
  }

  get(route, query, done) {
    if (typeof query === 'function') {
      done = query;
      query = null;
    }
    let req = superagent.get(route).use(this.prefix);
    this.setAuthorization(req);
    if (query) req.query(query);
    const p = new Promise((resolve, reject) => {
      req.end((err, res) => {
        if (done) return done(err, res);
        if (err) return reject(err);
        resolve(res);
      });
    });
    if (!done) return p;
  }

  jsonp(req, json, done) {
    this.setAuthorization(req);
    const p = new Promise((resolve, reject) => {
      req.send(json || {}).end((err, res) => {
        if (done) return done(err, res);
        if (err) return reject(err);
        resolve(res);
      });
    });
    if (!done) return p;
  }

  post(route, json, done) {
    if (typeof json === 'function') {
      done = json;
      json = null;
    }
    let req = superagent.post(route).use(this.prefix);
    return this.jsonp(req, json, done);
  }

  put(route, json, done) {
    if (typeof json === 'function') {
      done = json;
      json = null;
    }
    let req = superagent.put(route).use(this.prefix);
    return this.jsonp(req, json, done);
  }

  patch(route, json, done) {
    if (typeof json === 'function') {
      done = json;
      json = null;
    }
    let req = superagent.patch(route).use(this.prefix);
    return this.jsonp(req, json, done);
  }

  del(route, json, done) {
    if (typeof json === 'function') {
      done = json;
      json = null;
    }
    let req = superagent.del(route).use(this.prefix);
    return this.jsonp(req, json, done);
  }

  upload(route, filepath, done) {
    let opts = { name: 'buffer' };
    if (typeof filepath === 'object') {
      Object.assign(opts, filepath);
      filepath = opts.filepath;
    }
    if (!opts.filename) {
      opts.filename = path.basename(filepath);
    }

    let req = superagent.post(route).use(this.prefix).accept('*/*');
    this.setAuthorization(req);

    const p = new Promise((resolve, reject) => {
      req.on('response', function (res) {
        let err = null;
        if (parseInt(res.status) >= 400) err = new Error(res.body);
        if (done) return done(err, res);
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });

      fs.stat(filepath, function (err, stat) {
        if (err) return done(err);
        var form = formstream();
        form.file(opts.name, filepath, opts.filename, stat.size);
        req.set(form.headers());
        form.pipe(req);
      });
    });

    if (!done) return p;
  }

  login(credential, done) {
    if (typeof credential === 'function') {
      done = credential;
      credential = null;
    }
    credential = credential || this.credential;
    const p = this.post('/api/' + this.userModel + '/login?include=user', credential).then(res => {
      this.accessToken = res.body;
      if (done) return done();
      return res;
    }, err => {
      if (done) return done(err);
      return err;
    });
    if (!done) return p;
  }

  logout(done) {
    let _promise;
    if (this.accessToken) {
      _promise = this.post('/api/' + this.userModel + '/logout', done);
      this.accessToken = null;
    } else {
      _promise = Promise.resolve();
      if (done) return done();
    }
    return _promise;
  }

}

module.exports.boot = (app) => {
  before((done) => {
    server = app.start();
    app.on('started', done);
  });

  after(() => {
    server.close(() => {
      // process.exit(0);
    });
  });
}
module.exports.Request = Request;
