//配置文件
const path = require('path');
const moment = require('moment');
const mkdirp = require('mkdirp');
const winston = require('winston');
const DailyRotateFile=require('winston-daily-rotate-file');
const dateFormat=function() {
    return moment().format('YYYY-MM-DD HH:mm:ss:SSS');
};

//日志文件夹自动创建
const logDir='./logs/';
mkdirp.sync(logDir);

let config = {
    port: 3003,                             // 程序运行的端口
    proxy:'loopback, 127.0.0.1',             //信任的代理ip
    debug: true,                             // debug 为 true 时，用于本地调试，具体错误展示
    mysqlService1: {                         //mysql连接
        host: '127.0.0.1',
        user: 'root',
        port: 3306,
        password: '1234',
        database: ''
    },
    upload: {                                   // 文件上传配置
        path: path.join(__dirname, '../public/upload/'),
        url: 'http://127.0.0.1:3003/upload/',
        fileLimit: '10 * 1024 * 1024',                     //10MB
        fileMaxCount:3
    },
    logger: new (winston.Logger)({
        transports: [
            new DailyRotateFile({
                name: 'info-file',
                filename: path.join(logDir, 'info.log'),
                level: 'info',
                timestamp: dateFormat,
                localTime: true,
                maxsize: 1024*1024*10,
                datePattern:'.yyyy-MM-dd'
            }),
            new DailyRotateFile({
                name: 'error-file',
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                timestamp: dateFormat,
                localTime: true,
                maxsize: 1024*1024*10,
                datePattern:'.yyyy-MM-dd'
            })
        ]
    })
};

//崩溃日志
winston.handleExceptions(new winston.transports.File({
    filename: path.join(logDir, 'crash.log'),
    handleExceptions: true,
    timestamp:dateFormat,
    humanReadableUnhandledException: true,
    json: false
}));

module.exports = config;