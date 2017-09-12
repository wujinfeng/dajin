var comm = require('../middlewares/comm');
var config = require('../config/config');
var base = config.baseDb;

//角色类
class Role {
    //获取到1、该操作者所在公司能看到的所有角色，以及获取到该成员的真实姓名    2、所有角色的总数
    getAllList(company_id, role_name, pageNo, pageSize, cb) {
        var str;
        if (role_name != '') {    //按某一个角色名称搜索
            str = 'and r.name="' + role_name + '"';
        } else {
            str = '';
        }
        //1、通过操作者所在公司编码company_code经过模糊查询处理后的company_id在公司表中找到对应的所有公司   2、通过判断(找到的所有公司id==该角色所属公司b_role中的公司编码)获取到该操作者所在公司能看到的所有的角色    3、通过判断(所有角色中每一条数据的角色创建者和成员member表中的id相等)获取到该创建者成员的真实姓名
        comm.execSql(base, {
            sql: ' SELECT r.id, r.name, r.operator, r.ctime, m.realname,c.name as company_name  FROM ' + base + '.b_company as c ,' + base + '.b_role as r,' + base + '.b_member as m  where c.id like "' + company_id + '" and c.id=r.company_code and m.id=r.operator ' + str + ' order by r.id asc limit ' + (pageNo - 1) * pageSize + ',' + pageSize,
            option: ''
        }, (err, results) => {
            if (err) {
                return cb(err);
            } else {
                //获取该操作者所在公司可以看到的所有角色的总和
                comm.execSql(base, {
                    sql: 'select count(*) as count from ' + base + '.b_company as c ,' + base + '.b_role as r,' + base + '.b_member as m  where c.id like "' + company_id + '" and c.id=r.company_code and m.id=r.operator ' + str,
                    option: ''
                }, (err, rows) => {
                    if (err) {
                        return cb(err);
                    } else {
                        cb(err, results, rows[0].count);
                    }
                });
            }
        });
    }

    //获取该公司已经创建的所有角色，从而计算出要添加个人角色的唯一id值
    getRoleCode(company_code, cb) {
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_role where company_code=?',
            option: company_code
        }, (err, result) => {
            if (err) {
                return cb(err);
            } else {
                cb(err, result);
            }
        });
    }

    // 创建添加个人角色
    create(id, name, operator, company_code, cb) {
        var data = {
            id: id,
            name: name,
            operator: operator,
            company_code: company_code,
            ctime: new Date()
        };
        //先查询是否有重名的个人角色名称
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_role where name=?',
            option: data.name
        }, (err, result) => {
            if (err) {
                return cb(err);
            } else {
                if (result.length > 0) {
                    return cb('exist');
                } else {
                    //创建个人角色
                    comm.execSql(base, {sql: 'INSERT INTO ' + base + '.b_role SET ?', option: data}, cb);
                }
            }
        });
    }

    // 通过用户 id 修改角色名称
    getEdit(id, name, cb) {
        comm.execSql(base, {
            sql: 'update ' + base + '.b_role set name="' + name + '" where id="' + id + '"',
            option: ''
        }, cb);
    }

    // 删除之前先查询 判断有没有用户使用该角色
    existMember(role_code) {
        return new Promise(function (resolve, reject) {
            comm.execSql(base, {
                sql: 'select m.realname,c.name as company_name from ' + base + '.b_member as m,' + base + '.b_company as c where role_code like "%' + role_code + '%" and c.id=m.company_code',
                option: ''
            }, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //获取所有的平台
    getPlatforms(cb) {
        comm.execSql(base, {sql: 'select distinct platform from ' + base + '.b_power', option: ''}, cb);
    }

    //获取所有的平台对应的系统名称
    getPlatformsName(cb) {
        comm.execSql(base, {
            sql: 'select sysName as platformName,platform from ' + base + '.b_basis_platform',
            option: ''
        }, cb);
    }

    // 获取该平台下的所有的权限  功能库列表
    getRole(platform, cb) {
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_power where platform="' + platform + '"',
            option: ''
        }, cb);
    }

    //通过role_id,platform获取该角色(该平台下)未添加的功能    判断b_power表中除去拥有的，剩下就是未添加的       已经拥有的(先通过role_id在b_power_role表中获取到所有对应的power_id，然后再通过platfor在b_power获取到所属平台下的所有功能)
    getNotRolePowerByRoleId(role_id, paltformName, cb) {
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_power where platform=? and  id not in (select p.id from ' + base + '.b_role_power as rp,' + base + '.b_power as p where rp.power_id=p.id and p.platform=? and rp.role_id=?)',
            option: [paltformName, paltformName, role_id]
        }, cb);
    }

    //通过role_id,platform获取该角色(该平台下)已经添加的具体功能权限      这是已经拥有的(先通过role_id在b_power_role表中获取到所有对应的power_id，然后再通过platfor在b_power获取到所属平台下的所有功能)
    getRolePowerByRoleId(role_id, paltformName, cb) {
        comm.execSql(base, {
            sql: 'select p.id,p.name,p.url,p.module,p.platform,p.type from ' + base + '.b_role_power as rp,' + base + '.b_power as p where rp.power_id=p.id and p.platform=? and rp.role_id=?',
            option: [paltformName, role_id]
        }, cb);
    }

    //通过role_code,获取该角色    所有未拥有的功能，不分平台
    getNoPower(role_id, cb) {
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_power where id not in (select p.id from ' + base + '.b_role_power as rp,' + base + '.b_power as p where rp.power_id=p.id and rp.role_id=?)',
            option: role_id
        }, cb);
    }

    //通过role_code,获取该角色    所有已经拥有的功能，不分平台
    getRole_power(role_id, cb) {
        comm.execSql(base, {
            sql: 'select p.id,p.name,p.url,p.module,p.platform,p.type,rp.power_id from ' + base + '.b_role_power as rp,' + base + '.b_power as p where rp.power_id=p.id and rp.role_id=?',
            option: role_id
        }, cb);
    }

    // 在功能详情中为该角色   创建添加功能模块
    getPowerAdd(power_id, role_id, operator, cb) {
        let arr = power_id.split(',');
        let values = [];
        for (let i = 0; i < arr.length; i++) {
            values.push('("' + role_id + '","' + arr[i] + '","' + operator + '")');
        }
        comm.execSql(base, {
            sql: 'INSERT INTO ' + base + '.b_role_power (role_id,power_id,operator) values ' + values.join(','),
            option: ''
        }, cb);
    }


    // 通过power_id和role_id移除该角色（拥有的功能）
    powerDelete(power_id, role_id, cb) {
        let arr = power_id.split(',');
        let ask = [];
        for (let i = 0; i < arr.length; i++) {
            ask.push('?');
        }
        comm.execSql(base, {
            sql: 'DELETE FROM ' + base + '.b_role_power where role_id="' + role_id + '"and power_id in (' + ask.join(',') + ')',
            option: arr
        }, cb);
    }

    //chosen 模糊查询公司
    getCompanyChosen(company_id, cb) {
        comm.execSql(base, {
            sql: 'select id,name,area,type from ' + base + '.b_company where id like ? ',
            option: company_id
        }, (err, rows) => {
            if (err) {
                return cb(err);
            }
            cb(err, rows);
        });
    }

    //通过成员id获取成员信息
    getMemberById(member_id, cb) {
        comm.execSql(base, {
            sql: 'select b_member.role_code from ' + base + '.b_member where id=?',
            option: member_id
        }, cb);
    }
}

module.exports = Role;