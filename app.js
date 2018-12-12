// https://polar-mountain-34918.herokuapp.com/

var async = require('async');
var cheerio = require('cheerio');
var superagent = require('superagent');
var URL = require('url');
var express = require('express');

var app = express();

var cnodeUrl = 'https://cnodejs.org/';
// 最大并发数
var CONCURRENCY_COUNT = 5;
var RESULT = 'Wait a minute...';

// 获取主题url
var getTopicUrls = (callback) => {
    var topicUrls = [];

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
var fetchUrl = (url, callback) => {
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
var fetchTopicUrl = (url, callback) => {

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
var fetchUserUrl = (topicContent, callback) => {

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
var fetchUrls = (topicUrls, callback) => {
    async.mapLimit(topicUrls, CONCURRENCY_COUNT, (url, cb) => {
        fetchUrl(url, cb);
    }, (err, result) => {
        callback(null, result);
    });
};

var fetch = function () {
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