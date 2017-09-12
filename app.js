var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var session = require('express-session');
//var RedisStore = require('connect-redis')(session);
//var flash = require('connect-flash');
var config = require('./config/config');
var logg = config.logger;
var moment = require('moment');
var comm = require('./middlewares/comm');
var routes = require('./routes/index');

var app = express();
app.set('env', config.debug ? 'development' : 'production');
app.set('port', process.env.PORT || config.port);
app.set('trust proxy', config.proxy); 		// 指定子网和 IP 地址
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//模板需要的函数 （加入时间模块，秒格式化）
app.locals.moment = moment;
app.locals.second2Time = comm.second2Time;

// 添加模板必需的变量
app.use(function (req, res, next) {
    res.locals.user = '';
    res.locals.menus = {};
    next();
});

routes(app);

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    logg.error(err);
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    if(config.debug){
        res.render('error');
    }else{
        res.render('404');
    }
});

/* istanbul ignore next */
if (!module.parent) {
    app.listen(config.port, function () {
        console.log('listening on port: ' + config.port);
    });
}

module.exports = app;
