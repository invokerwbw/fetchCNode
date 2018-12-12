const app = require('../app');
const supertest = require('supertest');
const request = supertest(app);
const should = require('should');

describe('test/app.test.js', () => {

    it('should 200 when get / ', (done) => {
        request
            .get('/')
            .end((err, res) => {
                should.not.exists(err);
                res.status.should.equal(200);
                done();
            });
    });

    it('should 200 when get /clear ', (done) => {
        request
            .get('/clear')
            .end((err, res) => {
                should.not.exists(err);
                res.status.should.equal(200);
                done();
            });
    });

    after(function () {
        process.exit(0);
    });

});