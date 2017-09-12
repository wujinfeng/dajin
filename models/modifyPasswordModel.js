var comm = require('../middlewares/comm');
var config = require('../config/config');

var base = config.baseDb;
//成员类
class   Password {
    getPassword(mobile,cb){
        comm.execSql(base, {sql: 'select * from ' + base + '.b_member where mobile=?', option: mobile}, cb);
    }
    updatePassword(mobile,newPassword,cb){
        comm.execSql(base, {sql: 'update '+ base + '.b_member set password=? where mobile=?', option: [newPassword,mobile]}, cb);
    }
}

module.exports = Password;