var express = require('express');
var router = express.Router();
var RoleModel = require('../models/roleModel');
var comm = require('../middlewares/comm');
var async = require('async');
var config = require('../config/config');
var base = config.baseDb;
let logger = config.logger;

//  列表页面  角色列表>
router.use('/list', function (req, res, next) {
    var pageNo = req.query.pageNo || req.body.pageNo || 1;      //获取当前页
    var pageSize = 10;   //定义每页显示10条
    var menus = req.menus;
    var user = req.user;
    menus = comm.setMenus(menus, '权限管理', '角色列表');

    var role_name = req.body.searchKey ? req.body.searchKey : '';   //搜索的角色名称
    var company_code = req.user.company_code;   //当前操作者所在的公司编码
    var company_id = comm.getCompanyFuzzyId(company_code);  //获取模糊查询的公司id，例如102030001%或是1%
    var roleModel = new RoleModel({});
    roleModel.getAllList(company_id, role_name, pageNo, pageSize, (err, rows, count) => {    //获取到1、该操作者所在公司能看到的所有角色，以及获取到该成员的真实姓名    2、所有角色的总数
        if (err) {
            logger.error(err);
            return next(err);
        } else {
            roleModel.getCompanyChosen(company_id, (err, tree) => {//模糊查询公司
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    let pager = {
                        no: pageNo,
                        count: count,
                        total: Math.ceil(count / pageSize)
                    };
                    console.log(rows);
                    res.render('role/roleList', {
                        rows: rows,
                        role_name: role_name,
                        pager: pager,
                        menus: menus, user: user,
                        tree: tree
                    });
                }
            });
        }
    });
});

// 添加角色   角色列表>
router.post('/add', function (req, res, next) {
    var operator = req.user.id;//当前操作者,即b_member成员表里面的id
    var name = req.body.name ? req.body.name.trim() : '';  //角色名称
    var company_code = req.body.company_code ? req.body.company_code.trim() : ''; //公司code

    if (!name || !operator || !company_code) {
        return res.json({status: 300, msg: '请填写完整信息'});
    }
    var roleModel = new RoleModel({});
    roleModel.getRoleCode(company_code, (err, roleCodes) => {    //获取该公司已经创建的所有角色
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '创建角色失败'});
        } else {
            var id;
            if (roleCodes.length) {     //如果该公司已经有创建好的角色
                var role_id = [];
                for (var i = 0; i < roleCodes.length; i++) {
                    role_id.push(parseInt(roleCodes[i].id.split('JS')[1]));
                }

                var roleCode = parseInt(Math.max.apply(null, role_id) + 1);    //计算出已经创建的所有角色中最大的角色Id+1,即是要添加角色的唯一ID数值

                //转化成两位数
                if (roleCode > 9) {
                    roleCode = roleCode;
                } else {
                    roleCode = '0' + roleCode;
                }
                id = company_code + 'JS' + roleCode;
            } else {  //如果该公司没有创建好的角色
                id = company_code + 'JS01';
            }
            roleModel.create(id, name, operator, company_code, (err) => {
                if (err) {
                    if (err == 'exist') {
                        return res.json({status: 404, msg: '角色已存在'});
                    }
                    logger.error(err);
                    res.json({status: 500, msg: '服务器错误'});
                } else {
                    res.json({status: 200, msg: 'ok!'});
                }
            });
        }
    });

});

// 修改角色名称    角色列表>
router.post('/edit', function (req, res) {
    var id = req.body.id ? req.body.id.trim() : '';    //获取该角色的角色id
    var name = req.body.name ? req.body.name.trim() : '';   //角色名称

    if (!name || !id) {
        return res.json({status: 300, msg: '请填写完整信息'});
    }
    var Edit = new RoleModel({});
    Edit.getEdit(id, name, (err) => {
        if (err) {
            logger.error(err);
            res.json({status: 500, msg: '服务器错误'});
        } else {
            res.json({status: 200, msg: 'ok!'});
        }
    });
});

//首先判断是否有用户使用该角色    角色列表>
router.post('/existMember', function (req, res) {
    var role_code = req.body.id ? req.body.id : ''; //获取该角色的角色id
    if (!role_code) {
        return res.json({status: 400, msg: '请填写完整信息'});
    }
    var role = new RoleModel({});

    var roleCode = role_code.split(',');
    var results = [],
        existMember_data;
    var start = async function () {
        try {
            for (let i = 0; i < roleCode.length; i++) {
                existMember_data = await role.existMember(roleCode[i]);
                results = results.concat(existMember_data);
            }
            res.json({status: 200, msg: 'ok!', data: results});
        } catch (err) {
            return res.json({status: 500, msg: '成员角色关联出错' + err.message});
        }
    }
    start();
});

// 删除角色和角色已经拥有的功能权限   角色列表>
router.post('/delete', function (req, res) {
    var role_code = req.body.id ? req.body.id : '';    //获取该角色的角色id
    if (!role_code) {
        return res.json({status: 300, msg: '请填写完整信息'});
    }
    var Delete = new RoleModel({});

    var roleCode = role_code.split(',');

    comm.getPoolSer(base, (err, poolSer) => {    //获取mysql连接池
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '删除失败'});
        } else {
            poolSer.getConnection(function (err, connection) {     //连接到数据池
                if (err) {
                    logger.error(err);
                    return res.json({status: 500, msg: '删除失败'});
                } else {

                    connection.beginTransaction(function (err) {    //开始事务
                        if (err) {
                            return connection.rollback(function () {    //事务回滚
                                logger.error(err);
                                connection.release();    //事务释放
                                return res.json({status: 500, msg: '删除失败'});
                            });
                        } else {
                            var start = async function () {
                                try {
                                    for (var i = 0; i < roleCode.length; i++) {
                                        var id = roleCode[i];
                                        //删除个人角色拥有的功能的sql
                                        var del_rolePower_sql = 'DELETE FROM ' + base + '.b_role_power where role_id="' + id + '"';
                                        var del_rolePower_option = '';
                                        //删除个人角色的sql语句
                                        var del_role_sql = 'DELETE FROM ' + base + '.b_role where id="' + id + '"';
                                        var del_role_option = '';
                                        await sqlQuery(connection, del_rolePower_sql, del_rolePower_option, del_role_sql, del_role_option);
                                    }
                                    connection.commit(function (err) {
                                        if (err) {
                                            return connection.rollback(function () {
                                                logger.error(err);
                                                connection.release();
                                                return res.json({status: 500, msg: '删除失败'});
                                            });
                                        } else {
                                            connection.release();
                                            return res.json({status: 200, msg: 'ok!'});
                                        }
                                    });

                                } catch (err) {
                                    return connection.rollback(function () {
                                        logger.error(err);
                                        connection.release();
                                        return res.json({status: 500, msg: '删除失败'});
                                    });
                                }
                            }
                            start();
                        }
                    });
                }
            });
        }
    });

});

//get 获得权限表    角色列表>功能库
router.get('/power', function (req, res, next) {
    var menus = req.menus;
    var user = req.user;
    menus = comm.setMenus(menus, '权限管理', '功能库');
    var platform = req.query.platform || 'boss';  //获取平台，默认是boss
    var roleModel = new RoleModel({});
    async.parallel({
        platforms: function (cb) {       //获取所有的平台
            roleModel.getPlatforms((err, rows) => {
                cb(err, rows);
            })
        },
        platformsName: function (cb) {    //获取所有的平台对应的系统名称
            roleModel.getPlatformsName((err, rows) => {
                cb(err, rows);
            })
        },
        role: function (cb) {      // 获取该平台下的所有的权限  功能库列表
            roleModel.getRole(platform, (err, rows) => {
                cb(err, rows);
            })
        }
    }, function (err, results) {
        if (err) {
            logger.error(err);
            return next(err);
        } else {
            res.render('role/power', {
                rows: results.role,
                user: user,
                menus: menus,
                platforms: results.platforms,
                platformsName: results.platformsName,
                platform: platform
            });
        }
    })
});


// get 获得角色已有功能所属的系统    角色列表>功能配置>已有功能页
router.get('/power/:id/:name/:operator', function (req, res, next) {
    var menus = req.menus;
    var user = req.user;
    menus = comm.setMenus(menus, '权限管理', '角色列表');
    var role_id = req.params.id;    //个人角色编码   role_code
    var name = req.params.name;    //个人角色名称   name

    var roleModel = new RoleModel({});
    roleModel.getRole_power(role_id, (err, powers) => {     //获得拥有的所有功能
        if (err) {
            logger.error(err);
            return next(err);
        } else {
            var platform = [];
            for (var i = 0; i < powers.length; i++) {     //获得拥有的所有功能属于的平台
                if (platform.indexOf(powers[i].platform) == -1) {
                    platform.push(powers[i].platform);
                }
            }
            roleModel.getPlatformsName((err, platformsName) => {     //获取所有的平台对应的系统名称
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    var rows = [], curPlatform = [];
                    res.render('role/rolePower', {
                        curPlatform: curPlatform,
                        rows: rows,
                        platformsName: platformsName,
                        role_id: role_id,
                        menus: menus,
                        user: user,
                        name: name,
                        platform: platform
                    });
                }
            })
        }
    });
});

//获得该平台下拥有的功能     角色列表>功能配置>已有功能页
router.get('/platform', function (req, res, next) {
    var paltformname = req.query.paltformname;
    var role_id = req.query.role_id;
    var name = req.query.name;
    var menus = req.menus;
    var user = req.user;
    menus = comm.setMenus(menus, '权限管理', '角色列表');
    if (!paltformname || !role_id || !name) {
        return res.location('back');   //返回
    }
    var roleModel = new RoleModel({});
    roleModel.getRole_power(role_id, (err, powers) => {     //获得拥有的所有功能的平台
        if (err) {
            logger.error(err);
            return next(err);
        } else {
            var platform = [];
            for (var i = 0; i < powers.length; i++) {
                if (platform.indexOf(powers[i].platform) == -1) {
                    platform.push(powers[i].platform);
                }
            }
            roleModel.getRolePowerByRoleId(role_id, paltformname, (err, rows) => {   //通过个人成员编码和所属平台获得管理员自己拥有的power
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    roleModel.getPlatformsName((err, platformsName) => {//获取所有的平台对应的系统名称
                        if (err) {
                            logger.error(err);
                            return next(err);
                        } else {
                            res.render('role/rolePower', {
                                curPlatform: paltformname,
                                rows: rows,
                                platformsName: platformsName,
                                role_id: role_id,
                                menus: menus,
                                user: user,
                                name: name,
                                platform: platform
                            });
                        }
                    })
                }
            });
        }
    });
});

//获得该平台下未拥有的功能         角色列表>功能配置>模态框中未添加的功能
router.post('/platform', function (req, res) {
    var paltformname = req.body.paltformname;
    var role_id = req.body.role_id;

    if (!paltformname || !role_id) {
        return res.json({status: 500, msg: '参数缺失'});
    }
    var isAdmin = false;  // 操作者是否是管理员
    var member_id = req.user.id;  // 操作者的id
    var roleModel = new RoleModel({});
    roleModel.getNotRolePowerByRoleId(role_id, paltformname, (err, data) => {   //通过个人成员编码和所属平台获得管理员自己没有添加的power
        if (err) {
            logger.error(err);
            res.json({status: 500, msg: '服务器错误'});
        } else {
            roleModel.getMemberById(member_id, (err, member) => {  //获取操作者的权限并判断是否有超级管理员权限
                if (member[0].role_code.indexOf('101030000JS01') != -1) {
                    isAdmin = true;
                }
                res.json({status: 200, msg: 'ok!', data: data, isAdmin: isAdmin});
            })
        }
    });
});

//获得未拥有功能所属的平台         角色列表>功能配置>模态框中未添加的功能
router.post('/NoPower', function (req, res) {
    var role_id = req.body.role_id;

    if (!role_id) {
        return res.json({status: 500, msg: '参数缺失'});
    }
    var roleModel = new RoleModel({});
    roleModel.getNoPower(role_id, (err, data) => {   //通过个人成员编码获得管理员自己没有添加的power
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '服务器错误'});
        } else {
            roleModel.getPlatformsName((err, platformsName) => {
                if (err) {
                    logger.error(err);
                    res.json({status: 500, msg: '服务器错误'});
                } else {
                    res.json({status: 200, msg: 'ok!', data: data, platformsName: platformsName});
                }
            })
        }
    });

});


// post 添加功能      角色列表>功能配置>模态框中未添加的功能
router.post('/rolePower', function (req, res) {
    var role_id = req.body.role_id ? req.body.role_id.trim() : '';
    var power_id = req.body.power_id ? req.body.power_id.trim() : '';
    var operator = req.user.id;    //获取当前操作者id
    if (!power_id) {
        return res.json({status: 300, msg: '请填写完整信息'});
    }
    var powerAdd = new RoleModel({});
    powerAdd.getPowerAdd(power_id, role_id, operator, (err) => {
        if (err) {
            if (err == 'exist') {
                return res.json({status: 404, msg: '功能已存在'});
            }
            logger.error(err);
            return res.json({status: 500, msg: '服务器错误'});
        } else {
            return res.json({status: 200, msg: 'ok!'});
        }
    });
});

// 删除功能          角色列表>功能配置>已有功能页
router.post('/powerDelete', function (req, res) {
    var power_id = req.body.power_id;
    var role_id = req.body.role_id;
    if (!power_id) {
        return res.json({status: 400, msg: '缺少参数'});
    }
    var Delete = new RoleModel({});
    Delete.powerDelete(power_id, role_id, (err) => {
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '服务器错误'});
        } else {
            return res.json({status: 200, msg: 'ok!'});
        }
    });
});

//复制角色
router.post('/copyRole', function (req, res) {
    var operator = req.user.id;//当前操作者,即b_member成员表里面的id
    var companyCode = req.body.companyCode;
    var roleName = req.body.roleName;
    var roleId = req.body.roleId;
    console.log(req.body);
    var roleModel = new RoleModel({});
    roleModel.getRoleCode(companyCode, (err, roleCodes) => {    //获取该公司已经创建的所有角色
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '服务器错误'});
        } else {
            var id;
            if (roleCodes.length) {     //如果该公司已经有创建好的角色
                var role_id = [];
                for (var i = 0; i < roleCodes.length; i++) {
                    role_id.push(parseInt(roleCodes[i].id.split('JS')[1]));
                }
                var roleCode = parseInt(Math.max.apply(null, role_id) + 1);    //计算出已经创建的所有角色中最大的角色Id+1,即是要添加角色的唯一ID数值
                //转化成两位数
                if (roleCode > 9) {
                    roleCode = roleCode;
                } else {
                    roleCode = '0' + roleCode;
                }
                id = companyCode + 'JS' + roleCode;
            } else {  //如果该公司没有创建好的角色
                id = companyCode + 'JS01';
            }
            roleModel.getRole_power(roleId, (err, powers) => {     //获得拥有的所有功能
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    var copyPower = [];  // 要复制的角色的所有功能
                    powers.forEach(function (v, i) {
                        copyPower.push(v.power_id);
                    });
                    var copyPowerStr = copyPower.join(',');
                    roleModel.create(id, roleName, operator, companyCode, (err) => {  //在role表里创建角色
                        if (err) {
                            if (err == 'exist') {
                                return res.json({status: 404, msg: '角色已存在'});
                            }
                            logger.error(err);
                            res.json({status: 500, msg: '服务器错误'});
                        } else {
                            roleModel.getPowerAdd(copyPowerStr, id, operator, (err) => {  //在power_role表里添加复制角色的功能
                                if (err) {
                                    logger.error(err);
                                    return res.json({status: 500, msg: '服务器错误'});
                                } else {
                                    return res.json({status: 200, msg: 'ok!'});
                                }
                            });
                        }
                    });
                }
            })
        }
    });
})

//事务中的await  封装
var sqlQuery = function (connection, del_rolePower_sql, del_rolePower_option, del_role_sql, del_role_option) {
    return new Promise(function (resolve, reject) {
        connection.query(del_rolePower_sql, del_rolePower_option, function (err, row) {    //删除个人角色拥有的功能
            if (err) {
                reject(err);
            } else {
                connection.query(del_role_sql, del_role_option, function (err, rows) {    //删除个人角色
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row, rows);
                    }
                })
            }
        })
    });
}
module.exports = router;