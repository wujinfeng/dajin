var checkLogin = require('../middlewares/check').checkLogin;


//路由主入口
module.exports = function (app) {
    //登陆
    app.use('/', checkLogin, require('./login'));
    //角色权限
    app.use('/role', checkLogin, require('./role'));
    //帐务
    app.use('/account', checkLogin, require('./account'));
    //成员
    app.use('/member', checkLogin, require('./member'));
    //修改密码
    app.use('/modifyPassword', checkLogin, require('./modifyPassword'));
    //公司
    app.use('/company', checkLogin, require('./company'));
    //订单
    app.use('/order', checkLogin, require('./bossOrder'));
    //支付接口
    app.use('/payInterface', checkLogin, require('./payInterface'));
    //结算
    app.use('/settlement', checkLogin, require('./settlement'));
    //用户
    app.use('/customer', checkLogin, require('./customer'));
    //域值管理
    app.use('/dictionary',checkLogin,require('./dictFieldValue'));
    //维护表单
    app.use('/dictionary/dictTable',checkLogin,require('./dictTable'));
    //表详情
    app.use('/dictionary/dictField', checkLogin, require('./dictField'));
    // not found 404 page
    app.use(function (req, res, next) {
        if (!res.headersSent) {
            next(new Error('请输入正确的网址'));
        }
    });
};
