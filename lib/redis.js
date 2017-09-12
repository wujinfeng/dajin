//redis 封装
var conf = require('../config/config');
var redis = require('redis');

var MultiService = (function() {
    var client = redis.createClient({port: conf.redis.port, host: conf.redis.host, db: conf.redis.db});
    client.auth(conf.redis.passwd);
    client.on('error',  (err)=> {
        if (err) {
            console.log('connect to redis error: ');
            console.log(err);
            process.exit(1);
        }
    });
    client.on('connect',()=>{
        console.log('connect redis ok.');
    });

    var multi = function () {
        return client.multi();
    };

    var exec = function (_multi, _fn) {
        _multi.exec(_fn);
    };

    return {
        client : client,
        multi : multi,
        exec : exec
    };
}());

module.exports = MultiService;