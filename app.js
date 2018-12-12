// https://polar-mountain-34918.herokuapp.com/

const async = require('async');
const cheerio = require('cheerio');
const superagent = require('superagent');
const URL = require('url');
const express = require('express');

const app = express();

const cnodeUrl = 'https://cnodejs.org/';
// 最大并发数
const CONCURRENCY_COUNT = 3;
var RESULT = 'Wait a minute...';

// 获取主题url
const getTopicUrls = (callback) => {
    let topicUrls = [];

    superagent.get(cnodeUrl)
        .end((err, res) => {
            let $ = cheerio.load(res.text);

            $('#topic_list .topic_title').each((index, element) => {
                let $element = $(element);
                let href = URL.resolve(cnodeUrl, $element.attr('href'));
                topicUrls.push(href);
            });

            console.log('topicUrls:');
            console.log(topicUrls);
            callback(null, topicUrls);
        });
};

// 当前并发数
var concurrencyCount = 0;

// 对单个url进行抓取
const fetchUrl = (url, callback) => {
    concurrencyCount++;
    console.log(`现在的并发数是${concurrencyCount}，正在抓取的是${url}`);
    async.waterfall([
        (cb) => {
            cb(null, url);
        },
        fetchTopicUrl,
        fetchUserUrl
    ], function (err, result) {
        concurrencyCount--;
        callback(null, result);
    });
};

// 抓取主题页
const fetchTopicUrl = (url, callback) => {

    superagent.get(url)
        .end((err, res) => {

            let $ = cheerio.load(res.text);

            callback(null, {
                title: $('.topic_full_title').text().trim(),
                href: url,
                comment1: $('.reply_content').eq(0).text().trim(),
                userHref: URL.resolve(cnodeUrl, $('.author_content > a').eq(0).attr('href') || '')
            });

        });

};

// 抓取用户页
const fetchUserUrl = (topicContent, callback) => {

    let userHref = topicContent.userHref;

    if (userHref !== cnodeUrl) {
        superagent.get(userHref)
            .end((err, res) => {

                let $ = cheerio.load(res.text);

                callback(null, {
                    title: topicContent.title,
                    href: topicContent.href,
                    comment1: topicContent.comment1,
                    author1: $('div.userinfo > a').text().trim(),
                    score1: $('div.user_profile > ul > span').text().trim()
                });

            });
    } else {
        callback(null, {
            title: topicContent.title,
            href: topicContent.href,
            comment1: topicContent.comment1,
            author1: '',
            score1: ''
        });
    }

};

// 对url列表进行抓取
const fetchUrls = (topicUrls, callback) => {
    async.mapLimit(topicUrls, CONCURRENCY_COUNT, (url, cb) => {
        fetchUrl(url, cb);
    }, (err, result) => {
        callback(null, result);
    });
};

const fetch = function () {
    async.waterfall([
        getTopicUrls,
        fetchUrls
    ], function (err, result) {
        console.log('finished!');
        RESULT = result;
    });
};

app.get('/', (request, response) => {
    response.send(RESULT);
});

app.get('/clear', (request, response) => {
    RESULT = 'Wait a minute...';
    fetch();
    response.send('RESULT clear...');
});

app.listen(process.env.PORT || 3000, () => {
    let port = process.env.PORT || 3000;
    console.log(`app is running at port ${port}`);
    fetch();
});

module.exports = app;