var multer = require('multer');
var express = require('express');
var router = express.Router();
var async = require('async');
var MemberModel = require('../models/memberModel');
var CustomerModel = require('../models/customerModel');
var comm = require('../middlewares/comm');
var config = require('../config/config');
var mkdirp = require('mkdirp');
var path = require('path');
var xlsx = require('node-xlsx').default;
var SensorsAnalytics = require('sa-sdk-node');
let logger = config.logger;
let customPath = config.sensorLog;
const sa = new SensorsAnalytics();
sa.initLoggingConsumer(customPath);


//  列表页面
router.use('/list', function (req, res, next) {
    //获取公司编码
    var company_code;
    if (req.body.company_code || req.query.company_code) {
        company_code = req.body.company_code || req.query.company_code;
    } else {
        company_code = req.user.company_code;
        company_code = comm.getCompanyFuzzyId(company_code);
    }
    let pageNo = req.query.pageNo || req.body.pageNo || 1;
    let pageSize = req.query.pageSize || req.body.pageSize || 10;
    let status = req.query.status || req.body.status || '';
    let searchKey = req.query.searchKey || req.body.searchKey || '';
    let menus = req.menus;
    let user = req.user;
    menus = comm.setMenus(menus, '成员管理', '成员列表');
    let memberModel = new MemberModel({});
    memberModel.getMemberPager(pageNo, pageSize, status, company_code, searchKey, (err, result, count) => { // 成员列表
        if (err) {
            logger.error(err);
            next(err);
        } else {
            let pager = {
                no: pageNo,
                count: count,
                total: Math.ceil(count / pageSize)
            };
            let i = 0;
            async.whilst(
                function () {
                    return i < result.length;
                },
                function (cb) {
                    let member = result[i];
                    let role_code = member.role_code;
                    let company_code = member.company_code;
                    i++;
                    if (role_code && company_code) {
                        memberModel.getRole(role_code, (err, roleData) => { //通过id获取角色名字
                            if (err) {
                                logger.error(err);
                                member.roleName = '';
                                cb(null);
                            } else {
                                let roleName = [];
                                for (let i = 0; i < roleData.length; i++) {
                                    roleName.push(roleData[i].name);
                                }
                                member.roleName = roleName.join(',');
                                memberModel.getCompany(company_code, (err, companyData) => { //通过公司编码获取公司名字
                                    if (err) {
                                        logger.error(err);
                                        member.companyName = '';
                                        cb(null);
                                    } else {
                                        member.companyName = companyData[0] ? companyData[0].name : '';
                                        cb(null);
                                    }
                                });
                            }
                        });
                    } else if (role_code && !company_code) {
                        memberModel.getPower(role_code, (err, roleData) => { //获取权限
                            if (err) {
                                logger.error(err);
                                member.roleName = '';
                                cb(null);
                            } else {
                                member.roleName = roleData[0] ? roleData[0].name : '';
                                cb(null);
                            }
                        });
                    } else if (!role_code && company_code) {
                        memberModel.getCompany(company_code, (err, companyData) => { //通过公司编码获取公司名字
                            if (err) {
                                logger.error(err);
                                member.companyName = '';
                                cb(null);
                            } else {
                                member.companyName = companyData[0] ? companyData[0].name : '';
                                cb(null);
                            }
                        });
                    } else if (!role_code && !company_code) {
                        cb();
                    }
                },
                function (err) {
                    if (err) {
                        logger.error(err);
                        next(err);
                    } else {
                        let operatorCompany_code = comm.getCompanyFuzzyId(req.user.company_code);
                        memberModel.getCompanyById(operatorCompany_code, (err, company) => { // 通过公司编码模糊查询公司
                            if (err) {
                                logger.error(err);
                                return next(err);
                            } else {
                                res.render('member/list', {
                                    rows: result,
                                    user: user,
                                    menus: menus,
                                    pager: pager,
                                    status: status,
                                    info: '',
                                    searchKey: searchKey,
                                    companyArray: company,
                                    company_code: company_code
                                });
                            }
                        });
                    }
                }
            );
        }
    });
});

//编辑页面
router.get('/edit', function (req, res, next) {
    let memberId = req.query.id;
    let menus = req.menus;
    let user = req.user;
    menus = comm.setMenus(menus, '成员管理', '成员列表');
    let memberModel = new MemberModel({});
    let customerModel = new CustomerModel({});
    let company_code = req.user.company_code;
    let company_id = comm.getCompanyFuzzyId(company_code);
    memberModel.getMemberById(memberId, (err, row) => { // 通过用户 id 获取
        if (err) {
            logger.error(err);
            next(err);
        } else {
            memberModel.getRoleByOperator(memberId, (err, role) => { //获取操作者所在公司的角色
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    customerModel.getCustomerType((err, type) => { //获取用户类型
                        if (err) {
                            logger.error(err);
                            return next(err);
                        } else {
                            memberModel.getCompanyTree(company_id, (err, tree) => { //公司树结构
                                if (err) {
                                    logger.error(err);
                                    next(err);
                                } else {
                                    tree = JSON.stringify(tree);
                                    let company_code = row[0].company_code;
                                    let role_code = row[0].role_code;
                                    memberModel.getCompany(company_code, (err, company) => { //通过公司编码获取公司名字
                                        if (err) {
                                            logger.error(err);
                                            return next(err);
                                        } else {
                                            if (role_code) {
                                                memberModel.getCompanyByRoleId(role_code, (err, roleName) => { //通过角色编码获取角色名字
                                                    if (err) {
                                                        logger.error(err);
                                                        return next(err);
                                                    } else {
                                                        let roleNameArray = [];
                                                        roleName.forEach(function (v) {
                                                            roleNameArray.push(v.name);
                                                        });
                                                        res.render('member/edit', {
                                                            row: row,
                                                            role: role,
                                                            menus: menus,
                                                            user: user,
                                                            company: company,
                                                            roleName: roleNameArray.join(','),
                                                            tree: tree, treeId: company_code,
                                                            type: type
                                                        });
                                                    }
                                                });
                                            } else {
                                                res.render('member/edit', {
                                                    row: row,
                                                    role: role,
                                                    menus: menus,
                                                    user: user,
                                                    company: company,
                                                    roleName: '',
                                                    tree: tree, treeId: company_code,
                                                    type: type
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

//编辑后保存
router.post('/edit', function (req, res, next) {
    let mobile = req.body.mobile ? req.body.mobile.trim() : '';
    let password = req.body.password ? req.body.password.trim() : '';
    let name = req.body.name ? req.body.name.trim() : '';
    let id = req.body.id;
    let type = req.body.type;
    let companyCode = req.body.companyCode;
    let job = req.body.job ? req.body.job.trim() : '';
    let operator = req.user.id;
    if (!mobile || !(/^((17[0-9])|(13[0-9])|(14[5,7])|(15[0-9])|(18[0-9]))\d{8}$/.test(mobile)) || !name) {
        return res.json({status: 400, info: '填写完整信息'});
    }
    let data = {
        mobile: mobile,
        password: password,
        realname: name,
        type: type,
        job: job,
        operator: operator,
        companyCode: companyCode
    };
    let memberModel = new MemberModel(data);
    memberModel.editSave(id, (err) => { // 编辑保存
        if (err) {
            logger.error(err);
            res.json({status: 500, msg: err.message});
        } else {
            let memberLog = {};
            memberLog.member_id = id;
            memberLog.operator = operator;
            memberLog.content = '编辑基本信息';
            memberModel.creatMemberLog(memberLog, (err) => { //创建成员日志
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    //推送给用户后台
                    comm.sendUserServiceUpdate({mobile: data.mobile, userType: data.type}, (err, javaResult) => {
                        if (err) {
                            console.log(err);
                            logger.error(err);
                            return res.json({status: 500, msg: '保存成功，推送用户后台出错：' + err.message});
                        }
                        //埋点
                        eventTracking(javaResult.id, data.companyCode, data.type, data.job);
                        if (data.job == '线下维修') {
                            comm.sendBikeService({
                                type: 1,
                                mobile: data.mobile,
                                name: data.realname,
                                company_code: data.companyCode,
                                admin_id: id
                            }, (err) => {
                                if (err) {
                                    logger.error(err);
                                    res.json({status: 500, msg: '编辑成员成功，推送车务出错：' + err.message});
                                } else {
                                    console.log('送给车务后台ok');
                                    res.json({status: 200, msg: 'ok!'});
                                }
                            });
                        } else {
                            res.json({status: 200, msg: 'ok!'});
                        }
                    });
                }
            });
        }
    });
});

//修改权限后保存
router.get('/roleEdit', function (req, res, next) {
    let roleIdStr = req.query.roleIdStr;
    let roleNameStr = req.query.roleNameStr;
    let oldRoleName = req.query.oldRoleName;
    let memberId = req.query.memberId;
    let memberModel = new MemberModel({});
    let operator = req.user.id;
    memberModel.updataRoleCode(memberId, roleIdStr, (err, result) => { //更新成员列表的role_code
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '服务器错误'});
        } else {
            let memberLog = {};
            memberLog.member_id = memberId;
            memberLog.operator = operator;
            memberLog.content = '修改权限';
            memberLog.new = roleNameStr;
            memberLog.old = oldRoleName;
            memberModel.creatMemberLog(memberLog, (err) => { //创建成员日志
                if (err) {
                    logger.error(err);
                    return res.json({status: 500});
                } else {
                    if (result) {
                        res.json({
                            status: 200,
                            msg: 'ok',
                            roleNameStr: roleNameStr
                        });
                    } else {
                        res.json({
                            status: 500
                        });
                    }
                }
            });
        }
    });
});

//修改机构后保存
router.get('/companyEdit', function (req, res, next) {
    let company_code = req.query.company_code;
    let oldCompanyName = req.query.oldCompanyName;
    let newCompanyName = req.query.newCompanyName;
    let newMemberCode = req.query.newMemberCode;
    let memberId = req.query.memberId;
    let memberModel = new MemberModel({});
    let operator = req.user.id;
    memberModel.updataCompanyCode(memberId, company_code, newMemberCode, (err, result) => { //更新成员列表的company_code
        if (err) {
            logger.error(err);
            return res.json({status: 500, msg: '服务器错误'});
        } else {
            memberModel.updataRoleCodeById(memberId, (err) => { //通过用户id更新用户角色
                if (err) {
                    logger.error(err);
                    return res.json({status: 500, msg: '服务器错误'});
                } else {
                    let memberLog = {};
                    memberLog.member_id = memberId;
                    memberLog.operator = operator;
                    memberLog.content = '修改机构';
                    memberLog.new = newCompanyName;
                    memberLog.old = oldCompanyName;
                    memberModel.creatMemberLog(memberLog, (err) => { //创建成员日志
                        if (err) {
                            logger.error(err);
                            return res.json({status: 500});
                        } else {
                            if (result) {
                                res.json({
                                    status: 200,
                                    newMemberCode: newMemberCode,
                                    msg: 'ok',
                                });
                            } else {
                                res.json({
                                    status: 500
                                });
                            }
                        }
                    });
                }
            });
        }
    });
});

//获取一个公司所有角色
router.get('/roleList', function (req, res, next) {
    let company_code = req.query.company_code;
    let opeCompanyCode = req.user.company_code;  // 操作者所在的公司
    let memberModel = new MemberModel({});
    memberModel.getRoleByCompanyCode(company_code, (err, roleList) => {
        if (err) {
            logger.error(err);
            return res.json({status: 500});
        } else {
            if (opeCompanyCode == '101030000' && company_code != '101030000') {
                memberModel.getRoleByCompanyCode('101030000', (err, qiqiRoleList) => {
                    if (err) {
                        logger.error(err);
                        return res.json({status: 500});
                    } else {
                        res.json({
                            status: 200,
                            roleList: roleList.concat(qiqiRoleList)
                        });
                    }
                });
            } else {
                res.json({
                    status: 200,
                    roleList: roleList
                });
            }
        }
    });
})

//详情页面
router.get('/detail', function (req, res, next) {
    let memberId = req.query.id;
    let menus = req.menus;
    let user = req.user;
    menus = comm.setMenus(menus, '成员管理', '成员列表');
    let memberModel = new MemberModel({});
    memberModel.getMemberById(memberId, (err, row) => { // 通过用户 id 获取
        if (err) {
            logger.error(err);
            next(err);
        } else {
            memberModel.getMemberLogById(memberId, (err, memberLog) => { //通过成员id获取成员日志列表
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    res.render('member/detail', {
                        menus: menus,
                        user: user,
                        memberLog: memberLog,
                        row: row
                    });
                }
            });
        }
    });
});

//添加页面
router.get('/add', function (req, res, next) {
    let menus = req.menus;
    let user = req.user;
    menus = comm.setMenus(menus, '成员管理', '成员列表');
    let operator = req.user.id;
    let company_code = req.user.company_code;
    let company_id = comm.getCompanyFuzzyId(company_code);
    let memberModel = new MemberModel({});
    let customerModel = new CustomerModel({});
    memberModel.getCompanyData(operator, (err, company) => { //查询公司信息
        if (err) {
            logger.error(err);
            next(err);
        } else {
            memberModel.getRoleByOperator(operator, (err, role) => { //获取操作者所在公司的角色
                if (err) {
                    logger.error(err);
                    return next(err);
                } else {
                    memberModel.getCompanyTree(company_id, (err, tree) => { //公司树结构
                        if (err) {
                            logger.error(err);
                            next(err);
                        } else {
                            tree = JSON.stringify(tree);
                            customerModel.getCustomerType((err, type) => { //获取用户类型
                                if (err) {
                                    logger.error(err);
                                    return next(err);
                                } else {
                                    res.render('member/create', {
                                        user: user,
                                        company: company,
                                        role: role,
                                        rows: [],
                                        menus: menus,
                                        tree: tree,
                                        treeId: company_code,
                                        type: type
                                    });
                                }
                            });

                        }
                    });
                }

            });
        }
    });
});

// 保存
router.post('/add', function (req, res, next) {
    let mobile = req.body.mobile ? req.body.mobile.trim() : '';
    let password = req.body.password ? req.body.password.trim() : '';
    let name = req.body.name ? req.body.name.trim() : '';
    let companyCode = req.body.companyCode || '';
    let type = req.body.type;
    let job = req.body.job ? req.body.job.trim() : '';
    let role = req.body.role ? req.body.role.trim() : '';
    let operator = req.user.id;
    console.log(req.body);
    if (!mobile || !(/^((17[0-9])|(13[0-9])|(14[5,7])|(15[0-9])|(18[0-9]))\d{8}$/.test(mobile)) || !password || !name) {
        return res.json({status: 400, info: '填写完整信息'});
    }
    let numStr = '';
    let data = {
        code: '',
        mobile: mobile,
        password: password,
        realname: name,
        companyCode: companyCode,
        type: type,
        job: job,
        operator: operator,
        role_code: role
    };
    let memberModel = new MemberModel({});
    memberModel.getLastMemberId(companyCode, (err, result) => { //获取最新的成员ID
        if (err) {
            logger.error(err);
            return next(err);
        }
        if (result.length > 0) {
            let memberMaxId = result[0].code;
            numStr = comm.getMaxMemberId(memberMaxId);
        } else {
            numStr = '0001';
        }
        data.code = companyCode + numStr;
        console.log(data);
        let member = new MemberModel(data);
        member.create((err, result) => { // 创建成员
            if (err) {
                if (err == 'exist') {
                    return res.json({status: 404, msg: '手机号已存在'});
                }
                logger.error(err);
                res.json({status: 500, msg: '加入成员表错误：' + err.message});
            } else {
                let member_id = result.insertId;
                console.log(member_id);
                let memberModel = new MemberModel({});
                let memberLog = {};
                memberLog.member_id = member_id;
                memberLog.operator = operator;
                memberLog.content = '创建用户';
                memberModel.creatMemberLog(memberLog, (err) => { //创建成员日志
                    if (err) {
                        logger.error(err);
                        return next(err);
                    } else {
                        console.log('保存boss数据库ok');
                        //要推送给用户后台和车务后台
                        comm.sendUserServiceUpdate({mobile: data.mobile, userType: data.type}, (err, javaResult) => {
                            if (err) {
                                console.log(err);
                                logger.error(err);
                                return res.json({status: 500, msg: '加入成员表成功，推送用户后台出错：' + err.message});
                            }
                            console.log('送给用户后台ok');
                            //埋点
                            eventTracking(javaResult.id, data.companyCode, data.type, data.job);
                            if (data.job == '线下维修') {
                                comm.sendBikeService({
                                    type: 1,
                                    mobile: data.mobile,
                                    name: data.realname,
                                    company_code: data.companyCode,
                                    admin_id: member_id
                                }, (err) => {
                                    if (err) {
                                        logger.error(err);
                                        res.json({status: 500, msg: '加入成员表成功，推送车务出错：' + err.message});
                                    } else {
                                        console.log('送给车务后台ok');
                                        res.json({status: 200, msg: 'ok!'});
                                    }
                                });
                            } else {
                                res.json({status: 200, msg: 'ok!'});
                            }
                        });
                    }
                });
            }
        });
    });
});

// 更改状态 2禁用(离职)
router.post('/updateStatus', function (req, res, next) {
    let status = 2;
    let operator = req.user.id;
    let id = req.body.id ? req.body.id : '';
    if (!status || !id) {
        return res.json({status: 400, msg: '缺少参数'});
    }
    let memberModel = new MemberModel({});
    let idArr = id.split(',');
    let count = 0;
    async.whilst(
        function () {
            return count < idArr.length;
        },
        function (cb) {
            let oneId = idArr[count];
            count++;
            memberModel.updateStatus(oneId, status, (err) => { //更新状态
                if (err) {
                    logger.error(err);
                    return cb('服务器错误' + err.message);
                }
                //离职后要推送给用户后台和车务后台
                memberModel.getMemberById(oneId, (err, row) => { // 通过用户 id 获取
                    if (err) {
                        logger.error(err);
                        return cb('修改成功，获取手机号出错' + err.message);
                    }
                    let memberLog = {};
                    memberLog.member_id = oneId;
                    memberLog.operator = operator;
                    memberLog.content = '用户离职';
                    memberModel.creatMemberLog(memberLog, (err) => { //创建成员日志
                        if (err) {
                            logger.error(err);
                            return next(err);
                        } else {
                            //request 发送用户后台 更新 param  { mobile:'', userType:''}
                            comm.sendUserServiceUpdate({mobile: row[0].mobile, userType: 0}, (err, result) => {
                                if (err) {
                                    logger.error(err);
                                    return cb('修改成功，推送用户后台出错' + err.message);
                                }
                                if (!result || !result.type) {
                                    return cb('修改成功，推送用户后台出错result:' + result);
                                }
                                let type = result.type;
                                memberModel.updataTypeById(type, oneId, (err, type) => {
                                    if (err) {
                                        logger.error(err);
                                        return cb('修改成功，修改用户类型错' + err.message);
                                    }
                                    if (row[0].job == '线下维修') {
                                        comm.sendBikeService({
                                            type: 2,
                                            mobile: row[0].mobile,
                                            name: row[0].realname,
                                            company_code: row[0].company_code,
                                            admin_id: oneId
                                        }, (err) => {
                                            if (err) {
                                                logger.error(err);
                                                cb('修改成功，推送车务出错' + err.message);
                                            } else {
                                                cb();
                                            }
                                        });
                                    } else {
                                        cb();
                                    }
                                });
                            });
                        }
                    });
                });
            });
        }, function (err) {
            if (err) {
                logger.error(err);
                res.json({status: 500, msg: err});
            } else {
                res.json({status: 200, msg: 'ok!'});
            }
        });
});

//  删除
router.post('/delete', function (req, res, next) {
    let id = req.body.id ? req.body.id : '';
    console.log(id);
    if (!id) {
        return res.json({status: 400, msg: '缺少参数'});
    }
    let memberModel = new MemberModel({});
    memberModel.getMemberBatchId(id, (err, result) => { //批量获取成员信息手机号
        if (err) {
            logger.error(err);
            res.json({status: 500, msg: err.message});
        } else {
            let mobile = [];
            for (let i = 0; i < result.length; i++) {
                mobile.push(result[i].mobile);
            }
            comm.sendUserServiceDel({mobile: mobile.join(',')}, (err) => {
                if (err) {
                    logger.error(err);
                    res.json({status: 500, msg: '发送用户后台出错' + err.message});
                } else {
                    let count = 0;
                    async.whilst(
                        function () {
                            return count < result.length;
                        },
                        function (cb) {
                            let obj = result[count];
                            count++;
                            if (obj.job == '线下维修') {
                                comm.sendBikeService({
                                    type: 2,
                                    mobile: obj.mobile,
                                    name: obj.realname,
                                    company_code: obj.company_code,
                                    admin_id: obj.id
                                }, (err) => {
                                    cb(err);
                                });
                            } else {
                                cb();
                            }
                        }, function (err) {
                            if (err) {
                                logger.error(err);
                                return res.json({status: 500, msg: '发送车务后台出错' + err.message});
                            }
                            memberModel.delMemberById(id, (err) => { // 通过用户 id 删除
                                if (err) {
                                    logger.error(err);
                                    res.json({status: 500, msg: '服务器错误' + err.message});
                                } else {
                                    res.json({status: 200, msg: 'ok!'});
                                }
                            });
                        });
                }
            });
        }
    });
});

/**
 * 文件存储:路径，文件名
 */
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let operator = req.user.id;
        let path = config.upload.path + operator;
        mkdirp(path, function (err) {
            cb(err, path);
        });
    },
    filename: function (req, file, cb) {
        //let originalname = file.originalname;
        cb(null, 'member.xlsx');
    }
});

/**
 * 过滤文件
 * @param req
 * @param file
 * @param cb
 */
var fileFilter = function (req, file, cb) {
    //console.log(file);
    cb(null, true);
};
/**
 * 限制文件大小，个数
 * @type {{fileSize: number, files: number}}
 */
var limits = {fileSize: config.upload.fileLimit, files: config.upload.fileMaxCount};
var upload = multer({storage: storage, fileFilter: fileFilter, limits: limits});

//文件上传页面 /user/upload
router.get('/addExcel', function (req, res, next) {
    var menus = req.menus;
    menus = comm.setMenus(menus, '成员管理', '批量添加');
    res.render('member/addExcel', {menus: menus, info: ''});
});

//文件上传  /user/upload
router.post('/addExcel', upload.array('file', 1), function (req, res, next) {
    let menus = req.menus;
    menus = comm.setMenus(menus, '成员管理', '批量列表');
    let operator = req.user.id;
    let path = config.upload.path + operator + '/member.xlsx';
    let uploadExcel = xlsx.parse(path);
    let data = uploadExcel[0].data;
    console.log('excel');
    console.log(data);
    let numStr = '';
    let allSum = data.length;
    let realSum = 0;
    let memberModel = new MemberModel({});
    memberModel.getLastMemberIdByOperatorId(operator, (err, result) => { //获取该成员所在公司最大的编码
        if (err) {
            logger.error(err);
            return next(err);
        }
        if (result.length > 0) {
            numStr = result[0].code;
        } else {
            numStr = '0001';
        }
        let count = 1;
        let existLine = [];
        let errorLine = [];
        let reqError = [];
        async.whilst(
            function () {
                return count < allSum;
            },
            function (cb) {
                let value = data[count];
                numStr = comm.getMaxMemberId(numStr);
                count++;
                if (value.length > 0) {
                    realSum++;
                    if (!value[0] || !(/^((17[0-9])|(13[0-9])|(14[5,7])|(15[0-9])|(18[0-9]))\d{8}$/.test(value[0]))) {
                        errorLine.push(value[0] + '手机号格式错误');
                        return cb();
                    }
                    if (!value[2]) {
                        errorLine.push(value[0] + '名字错误');
                        return cb();
                    }
                    if (!value[3]) {
                        errorLine.push(value[0] + '公司编码错误');
                        return cb();
                    }

                    let mem = {
                        code: '' + value[3] + numStr,                                 //成员编码
                        mobile: '' + value[0] || '',                             //手机号
                        password: '' + value[1] || '123456',                     //密码
                        realname: '' + value[2],                                 //真实名字
                        companyCode: '' + value[3] || '',                        //公司编码
                        type: value[4] == '员工用户' ? 3 : 4,                    //用户类型 3员工用户、4VIP用户
                        job: '' + value[5] || '',                                     //职务
                        roleCode: '' + value[6] || '',                                //角色代码
                        status: value[7] == '启用' ? 1 : 2,                      //1启用，2禁用
                        operator: operator
                    };
                    let memberModel = new MemberModel(mem);
                    memberModel.create((err, result) => { // 创建成员
                        if (err) {
                            if (err == 'exist') {
                                existLine.push(mem.mobile + ':已存在');
                            } else {
                                logger.error(err);
                                errorLine.push(mem.mobile + ':出错');
                            }
                            cb();
                        } else {
                            let memberLog = {};
                            memberLog.member_id = result.insertId;
                            memberLog.operator = operator;
                            memberLog.content = '创建用户';
                            memberModel.creatMemberLog(memberLog, (err) => { //创建成员日志
                                if (err) {
                                    logger.error(err);
                                    return next(err);
                                } else {
                                    // 发送给用户后台
                                    comm.sendUserServiceUpdate({
                                        mobile: mem.mobile,
                                        userType: mem.type
                                    }, (err, javaResult) => {
                                        if (err) {
                                            console.log('加入成员表成功，推送用户后台出错', err);
                                            reqError.push(mem.mobile + ':推送用户后台出错');
                                        }
                                        //埋点
                                        eventTracking(javaResult.id, mem.companyCode, mem.type, mem.job);
                                        if (mem.job == '线下维修') {  //发送给车务后台
                                            comm.sendBikeService({
                                                type: 1,
                                                mobile: mem.mobile,
                                                name: mem.realname,
                                                company_code: mem.companyCode,
                                                admin_id: result.insertId
                                            }, (err) => {
                                                if (err) {
                                                    console.log('加入成员表成功，推送车务出错：', err);
                                                    reqError.push(mem.mobile + ':推送车务后台出错');
                                                    cb();
                                                } else {
                                                    cb();
                                                }
                                            });
                                        } else {
                                            cb();
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    cb();
                }
            },
            function (err) {
                if (err) {
                    logger.error(err);
                    res.render('member/addExcel', {menus: menus, info: err.message});
                } else {
                    let text = '';
                    let errorText = '';
                    let reqErrorText = '';
                    let message = 'success';
                    if (existLine.length > 0) {
                        text = existLine.join(',');
                        message = 'danger';
                    }
                    if (errorLine.length > 0) {
                        errorText = errorLine.join(',');
                        message = 'danger';
                    }
                    if (reqError.length > 0) {
                        reqErrorText = reqError.join(',');
                        message = 'danger';
                    }
                    res.render('member/addExcel', {
                        menus: menus,
                        message: message,
                        info: '批量导入完成！导入数据总计' + realSum + '条,' + text + errorText + reqErrorText
                    });
                }
            });
    });

});

router.get('/down', function (req, res, next) {
    var filePath = path.join(__dirname, '../public/down/member.xlsx');
    res.download(filePath, 'member.xlsx');
});

//埋点
function eventTracking(distinctId, company_code, user_type, job) {
    var properties = {};
    properties.company_code = company_code;
    properties.user_type = user_type;
    properties.job = job;
    sa.profileSet(distinctId, properties);
}


module.exports = router;


