process.env.NODE_ENV = 'test';
const mongoose = require("mongoose");
const db = require('../db');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const should = chai.should();
chai.use(chaiHttp);

describe('Users', () => {
  beforeEach((done) => {
    it('it should return 200 response on user registration', (done) => {
      let user = {email: 'sv@app.com', password: '123456'}
      chai.request(app)
      .post('/api/users/register')
      .send(user)
      .end((err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        done()
      })
    })
    done()
  })

  describe('/LOGIN User', () => {
    it('it should return 200 response on user login', (done) => {
      let user = {email: 'sv@app.com', password: '123456'}
      chai.request(app)
      .post('/api/users/login')
      .send(user)
      .end((err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('jwtToken')
        done()
      })
    })
  })

  describe('/jsonpatch test from user', () => {

    let token = ''

    before(function(done) {
      let user = {email: 'sv@app.com', password: '123456'}
      chai.request(app)
        .post('/api/users/login')
        .send(user)
        .end(function(err, res) {
          var result = JSON.parse(res.text);
          token = result.jwtToken;
          done();
        });
    });
  
    it('it should return 200 OK after patching json doc', (done) => {
      let doc = {
        baz: "qux",
        foo: "bar"
      }
      let patch = [
        { op: "replace", path: "/baz", value: "boo" }
      ]
      chai.request(app)
      .post('/api/users/patch-json')
      .set({ "Authorization": `Bearer ${token}` })
      .send({doc, patch})
      .end((err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        done()
      })
    })
  })

  describe('POST generate-image-thumbnail', () => {

    let token = ''

    before(function(done) {
      let user = {email: 'sv@app.com', password: '123456'}
      chai.request(app)
        .post('/api/users/login')
        .send(user)
        .end(function(err, res) {
          var result = JSON.parse(res.text);
          token = result.jwtToken;
          done();
        });
    });

    it('it should return 200 OK after resizing and downloading the image from given url', (done) => {
      let url = 'https://cdn.the-scientist.com/assets/articleNo/66820/hImg/34886/bird-banner3-x.png'
      chai.request(app)
      .post('/api/users/generate-image-thumbnail')
      .set({ "Authorization": `Bearer ${token}` })
      .send({url})
      .end((err, res) => {
        res.should.have.status(200)
        done()
      })
    })
  })
})