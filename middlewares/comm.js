let request = require('request');
let crypto = require('crypto');
let _ = require('lodash');
let pool = require('../lib/mysql');
let config = require('../config/config');

//md5加密
let md5 = function (text) {
    return crypto.createHash('md5').update(text).digest('hex');
};
//加密
let encrypt = function (text) {
    return md5(md5(text));
};
// 格式2位数字
let format = function (param) {
    return (parseInt(param) < 10) ? '0' + param : param;
};

//设置左则菜单栏选中栏目
let setMenus = function (menusArr, module, subMenuName) {
    let menus = [];
    if (menusArr.length > 0) {
        menus = _.cloneDeep(menusArr);
        for (let i = 0; i < menus.length; i++) {
            let obj = menus[i];
            if (obj.module === module) {
                obj.selected = true;
                for (let j = 0; j < obj.menus.length; j++) {
                    if (obj.menus[j].name === subMenuName) {
                        obj.menus[j].selected = true;
                        break;
                    }
                }
            }
            if (obj.selected) {
                break;
            }
        }
    }
    return menus;
};

//执行sql语句 param:{sql:'',option:''}
let execSql = function (db, param, cb) {
    pool.getConnection(function (err, connection) {
        if (err) {
            return cb(err);
        }
        if (param.option) {
            connection.query(param.sql, param.option, function (err, row) {
                connection.release();
                cb(err, row);
            });
        } else {
            connection.query(param.sql, function (err, row) {
                connection.release();
                cb(err, row);
            });
        }
    });
};

// 注意，菜单名字不能相同
let formatMenu = function (dataArr) {
    let menuArr = [];
    for (let i = 0; i < dataArr.length; i++) {
        let obj = dataArr[i];
        //检测是否已经存在此模块
        let existModule = false;
        for (let j = 0; j < menuArr.length; j++) {
            if (menuArr[j].module === obj.module) {
                existModule = true;
                menuArr[j].menus.push({
                    url: obj.url,
                    selected: false,
                    name: obj.name
                });
                break;
            }
        }
        if (!existModule) {
            menuArr.push({
                selected: false,
                module: obj.module,
                icon: obj.icon,
                menus: [{
                    url: obj.url,
                    selected: false,
                    name: obj.name
                }]
            });
        }
    }
    return menuArr;
};

// 秒转时间
let second2Time = function (second) {
    let s = parseInt(second);
    let t = '00:00:00';
    if (s > 0) {
        let hour = parseInt(s / 3600);
        let min = parseInt(s / 60) % 60;
        let sec = s % 60;
        t = '' + format(hour) + ':' + format(min) + ':' + format(sec);
    }
    return t;
};


//导出
module.exports = {
    encrypt: encrypt,
    format: format,
    setMenus: setMenus,
    formatMenu: formatMenu,
    second2Time: second2Time,
    execSql: execSql
};

//菜单格式
/*
 var s =
 [
 {
 selected: false,
 module: '数据统计',
 icon: 'fa-laptop',
 menus: [
 {
 url: '/statistic/dashboard',
 selected: false,
 name: '统计概括'
 },
 {
 url: '/statistic/customer',
 selected: false,
 name: '用户统计'
 }
 ]
 },
 {
 selected: false,
 module: '数据统计',
 icon: 'fa-laptop',
 menus: [
 {
 url: '/statistic/dashboard',
 selected: false,
 name: '统计概括'
 },
 {
 url: '/statistic/customer',
 selected: false,
 name: '用户统计'
 }
 ]
 }

 ];*/
