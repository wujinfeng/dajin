var comm = require('../middlewares/comm');
var config = require('../config/config');

var base = config.baseDb;
//成员类
class Member {
    constructor(o) {
        this.mobile = o.mobile ? o.mobile.trim() : '';                           //手机号
        this.code = o.code ? o.code.trim() : '';                                 //成员编码
        this.password = o.password ? o.password.trim() : '';                     //密码
        this.realname = o.realname ? o.realname.trim() : '';                     //真实名字
        this.companyCode = o.companyCode || '';                                  //公司编码
        this.type = o.type || '';                                                //用户类型 1临时用户（未缴纳保证金）、2会员用户（已缴纳保证金）、3员工用户、4VIP用户
        this.job = o.job ? o.job.trim() : '';                                    //职务
        this.role_code = o.role_code || '';                                        //角色代码
        this.status = o.status || 1;                                             //1启用，2禁用
        this.operator = o.operator;                                              //操作着
    }

    // 创建成员
    create(cb) {
        let member = {
            code: this.code,
            mobile: this.mobile,
            password: comm.encrypt(this.mobile + this.password),
            realname: this.realname,
            company_code: this.companyCode,
            type: this.type,
            job: this.job,
            role_code: this.role_code,
            operator: this.operator,
            status: this.status,
            ctime: new Date()
        };
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_member where mobile=?',
            option: member.mobile
        }, (err, result) => {
            if (err) {
                return cb(err);
            }
            if (result.length > 0) {
                return cb('exist');
            }
            comm.execSql(base, {sql: 'INSERT INTO ' + base + '.b_member SET ?', option: member}, cb);
        });
    }

    // 成员列表
    getMemberPager(pageNo, pageSize, status, company_code, searchKey, cb) {
        let param, param1, strKey, strKey1;
        //判断搜索条件
        if (searchKey) {
            searchKey = searchKey.trim();
            if (searchKey.length == 11) {
                strKey = ' and mobile=? ';
                strKey1 = ' mobile=? ';
            } else {
                strKey = ' and realname=? ';
                strKey1 = ' realname=? ';
            }
        } else {
            strKey = '';
        }
        if (status) {
            if (company_code.indexOf('%')) {
                param = {
                    sql: 'select * from ' + base + '.b_member where status=? and company_code like "' + company_code + '"' + strKey + ' order by ctime desc  limit ' + (pageNo - 1) * pageSize + ',' + pageSize,
                    option: [status, searchKey]
                };
                param1 = {
                    sql: 'select count(*) as count  from ' + base + '.b_member where status=? and company_code like "' + company_code + '"' + strKey,
                    option: [status, searchKey]
                };
            } else {
                param = {
                    sql: 'select * from ' + base + '.b_member where status=? ' + strKey + ' and company_code=? order by ctime desc  limit ' + (pageNo - 1) * pageSize + ',' + pageSize,
                    option: [status, searchKey, company_code]
                };
                param1 = {
                    sql: 'select count(*) as count  from ' + base + '.b_member where status=?' + strKey + ' and company_code=?',
                    option: [status, searchKey, company_code]
                };
            }
        } else {
            if (company_code.indexOf('%')) {
                param = {
                    sql: 'select * from ' + base + '.b_member where company_code like "' + company_code + '"' + strKey + ' order by ctime desc limit ' + (pageNo - 1) * pageSize + ',' + pageSize,
                    option: [searchKey]
                };
                param1 = {
                    sql: 'select count(*) as count from ' + base + '.b_member  where company_code like "' + company_code + '"' + strKey,
                    option: [searchKey]
                };
            } else {
                param = {
                    sql: 'select * from ' + base + '.b_member where' + strKey1 + ' and company_code=? order by ctime desc limit ' + (pageNo - 1) * pageSize + ',' + pageSize,
                    option: [searchKey, company_code]
                };
                param1 = {
                    sql: 'select count(*) as count from ' + base + '.b_member  where' + strKey1 + 'and company_code=?',
                    option: [searchKey, company_code]
                };
            }
        }
        comm.execSql(base, param, (err, result) => {
            if (err) {
                cb(err);
            } else {
                comm.execSql(base, param1, (err, row) => {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, result, row[0].count);
                    }
                });
            }
        });
    }

    // 通过公司编码模糊查询公司
    getCompanyById(id, cb) {
        comm.execSql(base, {
            sql: 'select id,name from ' + base + '.b_company where id like "' + id + '"',
            option: id
        }, cb);
    }

    // 编辑保存
    editSave(id, cb) {
        let member = {
            mobile: this.mobile,
            realname: this.realname,
            type: this.type,
            job: this.job,
            operator: this.operator
        };
        if (this.password) {
            member.password = comm.encrypt(this.mobile + this.password);
        }
        comm.execSql(base, {
            sql: 'update ' + base + '.b_member set ? where id=?',
            option: [member, id]
        }, cb);
    }

    //通过用户id更新用户角色
    updataRoleCodeById(id, cb) {
        comm.execSql(base, {sql: 'update ' + base + '.b_member set role_code="" where id=?', option: id}, cb);
    }

    //通过用户id更新用户类型
    updataTypeById(type, id, cb) {
        comm.execSql(base, {sql: 'update ' + base + '.b_member set type=? where id=?', option: [type, id]}, cb);
    }

    // 通过用户id获取
    getMemberById(id, cb) {
        comm.execSql(base, {sql: 'select * from ' + base + '.b_member where id=?', option: id}, cb);
    }

    // 通过用户code获取
    getMemberByCode(code, cb) {
        comm.execSql(base, {sql: 'select * from ' + base + '.b_member where code=?', option: code}, cb);
    }

    // 获取最新的成员ID
    getLastMemberId(companyCode, cb) {
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_member where company_code=? order by id desc limit 1',
            option: companyCode
        }, cb);
    }

    // 获取该成员所在公司最大的编码
    getLastMemberIdByOperatorId(operatorId, cb) {
        comm.execSql(base, {
            sql: 'select * from ' + base + '.b_member where company_code=(select company_code from ' + base + '.b_member where id=?) order by id desc limit 1',
            option: operatorId
        }, cb);
    }

    // 通过公司编码获取公司名字
    getCompany(companyCode, cb) {
        comm.execSql(base, {sql: 'select name from ' + base + '.b_company where id=?', option: companyCode}, cb);
    }

    // 通过角色编码获取角色名字
    getCompanyByRoleId(roleId, cb) {
        let arr = roleId.split(',');
        let ask = [];
        for (let i = 0; i < arr.length; i++) {
            ask.push('?');
        }
        comm.execSql(base, {sql: 'select name from ' + base + '.b_role where id in (' + ask + ')', option: arr}, cb);
    }

    // 通过id获取角色名字
    getRole(roleCode, cb) {
        if (!roleCode) {
            return cb('此用户无权限');
        }
        let idsArr = roleCode.split(',');
        let ask = [];
        for (let i = 0; i < idsArr.length; i++) {
            ask.push('?');
        }
        comm.execSql(base, {
            sql: 'select distinct name from ' + base + '.b_role where id in(' + ask + ')',
            option: idsArr
        }, cb);
    }

    // 获取操作者所在公司的角色
    getRoleByOperator(operator, cb) {
        comm.execSql(base, {
            sql: 'select b_role.id,b_role.name from ' + base + '.b_role,' + base + '.b_member where ' + base + '.b_role.company_code=' + base + '.b_member.company_code and ' + base + '.b_member.id=?',
            option: operator
        }, cb);
    }

    //获取公司所有角色
    getRoleByCompanyCode(company_code, cb) {
        comm.execSql(base, {
            sql: 'select id,name from ' + base + '.b_role  where company_code=?',
            option: company_code
        }, cb);
    }

    // 更新状态
    updateStatus(id, status, cb) {
        comm.execSql(base, {sql: 'update  ' + base + '.b_member set status=? where id=?', option: [status, id]}, cb);
    }

    // 更新成员列表的role_code
    updataRoleCode(id, roleCode, cb) {
        comm.execSql(base, {
            sql: 'update  ' + base + '.b_member set role_code=? where id=?',
            option: [roleCode, id]
        }, cb);
    }

    // 更新成员列表的company_code
    updataCompanyCode(id, companyCode, newMemberCode, cb) {
        comm.execSql(base, {
            sql: 'update  ' + base + '.b_member set company_code=?,code=? where id=?',
            option: [companyCode, newMemberCode, id]
        }, cb);
    }

    // 查询公司信息
    getCompanyData(id, cb) {
        comm.execSql(base, {
            sql: 'select b_company.id,b_company.name from ' + base + '.b_company,' + base + '.b_member where ' + base + '.b_member.id=? and ' + base + '.b_member.company_code=' + base + '.b_company.id',
            option: id
        }, cb);
    }

    //  通过用户 id 删除
    delMemberById(id, cb) {
        let arr = id.split(',');
        let ask = [];
        for (let i = 0; i < arr.length; i++) {
            ask.push('?');
        }
        comm.execSql(base, {sql: 'DELETE from ' + base + '.b_member where id in (' + ask + ')', option: arr}, cb);
    }

    // 批量获取成员信息手机号
    getMemberBatchId(id, cb) {
        let arr = id.split(',');
        let ask = [];
        for (let i = 0; i < arr.length; i++) {
            ask.push('?');
        }
        comm.execSql(base, {sql: 'select * from ' + base + '.b_member where id in (' + ask + ')', option: arr}, cb);
    }

    // 获取权限
    getPower(roleCode, cb) {
        if (!roleCode) {
            return cb('此用户无权限');
        }
        let idsArr = roleCode.split(',');
        let ask = [];
        for (let i = 0; i < idsArr.length; i++) {
            ask.push('?');
        }
        comm.execSql(base, {
            sql: 'select distinct p.url,p.`name`, p.module, p.icon, p.id from ' + base + '.b_role_power rp, ' + base + '.b_power p  where rp.role_id in(' + ask.join(",") + ') and rp.power_id=p.id and p.platform="boss" order by p.id asc',
            option: idsArr
        }, cb);
    }

    // 通过成员id获取成员日志列表
    getMemberLogById(memberId, cb) {
        comm.execSql(base, {
            sql: 'SELECT l.id,l.content,l.content,l.old,l.new,l.ctime,m.realname FROM  ' + base + '.b_member_log as l , ' + base + '.b_member as m WHERE l.operator=m.id and member_id=? order by ctime desc',
            option: memberId
        }, cb);
    }

    // 创建成员日志
    creatMemberLog(memberLog, cb) {
        let fullMemberLog = {
            operator: memberLog.operator,
            member_id: memberLog.member_id,
            content: memberLog.content || '',
            old: memberLog.old || '',
            new: memberLog.new || ''
        };
        comm.execSql(base, {sql: 'INSERT INTO ' + base + '.b_member_log SET ?', option: fullMemberLog}, cb);
    }

    // 树结构
    getCompanyTree(company_id, cb) {
        comm.execSql(base, {
            sql: 'select id,name,type,area from ' + base + '.b_company where id like ? ',
            option: company_id
        }, (err, rows) => {
            if (err) {
                return cb(err);
            }
            cb(err, rows);
        });
    }

}

module.exports = Member;