//左边导航参单栏

var menu = function () {
    var data = {
        statistic:{
            selected: false,
            title: '数据统计',
            icon:'fa-laptop',
            menus: {
                dashboard: {
                    url: '/statistic/dashboard',
                    selected: false,
                    title: '统计概括'
                },
                customer: {
                    url: '/statistic/customer',
                    selected: false,
                    title: '用户统计'
                },
                channel: {
                    url: '/statistic/channel',
                    selected: false,
                    title: '渠道统计'
                },
                recharge: {
                    url: '/statistic/recharge',
                    selected: false,
                    title: '充值统计'
                },
                order: {
                    url: '/statistic/order',
                    selected: false,
                    title: '订单统计'
                },
                terminal: {
                    url: '/statistic/terminal',
                    selected: false,
                    title: 'APP终端统计'
                },
                reserve: {
                    url: '/statistic/reserve',
                    selected: false,
                    title: '约车方式统计'
                }
            }
        }
        /*,
        user: {
            selected: false,
            title: '客服管理',
            icon: 'fa-book',
            menus: {
                create: {
                    url: '/user/create',
                    selected: false,
                    title: '添加客服'
                }
            }
        }*/
    };
    return data;
};

module.exports = menu;

