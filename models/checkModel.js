/**
 * Created by PVer on 2017/5/4.
 */
var config = require('../config/config');
var comm = require('../middlewares/comm');
var base = config.baseDb;

class Check {

    //通过输入的网址url查询到系统名字name
    getSystemName(url, cb) {
        comm.execSql(base, {sql: 'select * from ' + base + '.b_basis_platform where url=?', option: url}, cb);
    }
}

module.exports = Check;