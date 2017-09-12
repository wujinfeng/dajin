var express = require('express');
var router = express.Router();
var config = require('../config/config');
// let logger = config.logger;
var sso = config.sso;

router.use(function (req, res, next) {
    res.locals.user = req.user;
    next();
});
// get 登录成功的主页
router.get('/', function (req, res) {
    var menus = req.menus;
    var user = req.user;
    res.render('index', {menus: menus,user:user});
});

router.get('/logout', function (req, res) {
    res.clearCookie('access_token',{domain:config.domain});
    return res.redirect(sso + req.platformName);
});
module.exports = router;