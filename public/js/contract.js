/**
 * Created by wu on 17-6-4.
 * 公司合同管理
 */

//合同管理
$(function () {
    var show2hideOrg=function() {
        if ($('.recharge_unit').filter('.btn-success').attr('data-v') == 3) {
            $('#orgproportion').show();
        } else {
            $('#orgproportion').hide();
        }
    };
    show2hideOrg();
    var initStatus = function(){     //初始状态页面
        $('#saveContract').addClass('hidden');
        $('#cancelContract').addClass('hidden');
        $('.tablehandle').addClass('hidden');
        $('#jjfadd').addClass('hidden');
        $('.init-recharge-unit').removeClass('hidden');
        $('#editContract').removeClass('hidden');
        $('.contract-input').addClass('init-status').attr('readonly','readonly');
    };
    initStatus();
    var editStatus = function () {   //编辑状态页面
        $('#saveContract').removeClass('hidden');
        $('#cancelContract').removeClass('hidden');
        $('.tablehandle').removeClass('hidden');
        $('#jjfadd').removeClass('hidden');
        $('.init-recharge-unit').addClass('hidden');
        $('#editContract').addClass('hidden');
        $('.contract-input').removeClass('init-status').removeAttr('readonly');
    };
    $('#cancelContract').on('click',function () {
        $('.bikenum').val( $('.bikenum').attr("data-value"));
        $('#recharge_percent').val($('#recharge_percent').attr("data-value"));
    });
    //点击合同保存
    $('#saveContract').click(function (e) {
        e.preventDefault();
        var companyId = $('#companyId').val();
        var bikenum = $('.bikenum').val();
        var recharge_percent = $('#recharge_percent').val();
        if(!companyId){
            return swal("没有获取公司id", "", "error");
        }
        if(!bikenum || isNaN(bikenum)){
            return swal("请填写正确车辆数目", "", "error");
        }
        if(recharge_percent==''){
            return swal("没有充值卡分配：机构占比（%）", "", "error");
        }
        if(Number(recharge_percent)>100){
            return swal("充值卡分配：机构占比（%）不能大于100%", "", "error");
        }
        var data = {
            companyId: companyId,
            bikenum: bikenum,
            recharge_percent: recharge_percent
        };
        ajax('/company/saveContract', data, '你确定提交吗？','',function (err,result) {
            if(err){
                return  swal("修改出错！", err, "error");
            }
            if (result.status == 200) {
                initStatus();
                updateCompanyLogTable(result.company_log);
                $('.bikenum').val(result.data[0].bikenum);
                $('#recharge_percent').val(result.data[0].recharge_percent);
                $('.bikenum').attr({"data-value":result.data[0].bikenum});
                $('#recharge_percent').attr({"data-value":result.data[0].recharge_percent});
                swal("添加成功！", "Good", "success");
            } else {
                swal("修改出错！", result.msg, "error");
            }
        });
    });

    //点击编辑按钮
    $('#editContract').click(function () {
        editStatus();
    });
    //点击取消按钮
    $('#cancelContract').click(function () {
        initStatus();
    });


    var add_edit = 0,
        companyId = $('#companyId').val();  //add_edit: 1是添加按钮激活， 2是编辑按钮激活的。
    //点击居间方添加按钮
    $(document).on('click','#jjfadd', function () {
        add_edit = 1;
        $('#myModalContract .modal-title').html('添加');
        $('#partner').val('').removeAttr('disabled');    //居间方
        $('#money').val('');                             //分成(元)
        $('#roletype').removeAttr('disabled');   //合作方角色类型
        $('#percent').val('');                           //占合作方分成(%)
        $("#partner").trigger("chosen:updated");         //更新下状态
    });
    //点击居间方编辑按钮
    $(document).on('click','.jjfedit', function () {
        add_edit = 2;
        $('#myModalContract .modal-title').html('编辑');
        $('#partner').val($(this).attr('data-partnerid')).attr('disabled',true);  //居间方
        $('#roletype').val($(this).attr('data-roletype')).attr('disabled',true);  //合作方角色类型
        $('#money').val($(this).attr('data-money'));        //分成(元)
        $('#percent').val($(this).attr('data-percent'));     //占合作方分成(%)
        $("#partner").trigger("chosen:updated");            //更新下状态
    });

    //保存到后台
    $('#addEdit').click(function (e) {
        e.preventDefault();
        var partnerId = $('#partner').val();
        var money = $('#money').val();
        var percent = $('#percent').val();
        var roleType = $('#roletype').val();

        if(!partnerId){
            swal("请选择居间方！", "", "error");
            return false;
        }
        if(!money){
            swal("请填写分成！", "", "error");
            return false;
        }
        if(percent==='' || percent>100 || percent<0 ){
            swal("请填写合作方分成0-100！", "", "error");
            return false;
        }

        if (add_edit == 1) { //点击添加按钮
            ajax('/company/jjfadd', {companyId:companyId, partnerId: partnerId, money: money, percent: percent, roleType:roleType}, '你确定提交吗？','', function (err,result) {
                if(err){
                    return  swal("修改出错！", err, "error");
                }
                if (result.status == 200) {
                    $('.close').click();
                    updateJJFTable(result.data);
                    updateCompanyLogTable(result.company_log);
                    swal("添加成功！", "Good", "success");
                } else {
                    swal("修改出错！", result.msg , "error");
                }
            });
        } else if (add_edit == 2) {  //点击编辑
            ajax('/company/jjfedit',{companyId:companyId, partnerId: partnerId, money: money, percent: percent},'你确定提交吗？','', function (err,result) {
                if(err){
                    return  swal("修改出错！", err , "error");
                }
                if (result.status == 200) {
                    $('.close').click();
                    updateCompanyLogTable(result.company_log);
                    updateJJFTable(result.data);
                    swal("修改成功！",  "Good", "success");
                } else {
                    swal("修改失败！", result.msg , "error")
                }
            });
        }
    });

    //点击删除
   $(document).on('click', '.delete', function () {
        var partnerId = $(this).attr('data-partnerid'),
            url = '/company/jjfdelete';
        if (!partnerId) {
            swal("亲，没有选择id", "", "error");
            return false;
        }
        ajax(url, {companyId:companyId, partnerId: partnerId},'你确定删除吗？', '', function (err, result) {
            if(err){
                return  swal("修改出错！", err , "error");
            }
            if (result.status == 200) {
                updateCompanyLogTable(result.company_log);
                updateJJFTable(result.data);
                swal("修改成功！", "Good, 1秒后自动刷新", "success");
            } else {
                swal("修改失败！", result.msg , "error")
            }
        });
    });
    //发送ajax
    function ajax(url, data,title, text, cb) {
        swal({
                title: title||'',
                text: text || '',
                type: "info",
                showCancelButton: true,
                closeOnConfirm: false,
                showLoaderOnConfirm: true,
                confirmButtonText: "确定",
                cancelButtonText: "取消",
            },
            function () {
                $.ajax({
                    url: url,
                    data: data,
                    type: 'post',
                    async: true,
                    dataType: 'json',
                    success: function (result) {
                        cb(null,result);
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        cb(textStatus || errorThrown)
                    }
                });
            });
    }
    function updateJJFTable(contract) {
        var html = '';
        for(var i=0; i<contract.length; i++){
            var hehuoren = '';
            if(contract[i].role_type == 1) {
                hehuoren = '平台方';
            }else if(contract[i].role_type == 2){
                hehuoren = '合作方';
            }else if(contract[i].role_type == 3){
                hehuoren = '渠道方';
            }else if(contract[i].role_type == 4){
                hehuoren = '居间方';
            }else if(contract[i].role_type == 5){
                hehuoren = '渠道方秘书';
            }else if(contract[i].role_type == 6){
                hehuoren = '运营方';
            }else{
                continue;
            }
            html += '<tr><td class="text-center" data-title="合伙人">'+hehuoren+'</td>' +
                '<td class="text-center" data-title="名称">'+contract[i].name+'</td>'+
                '<td class="text-center" data-title="类型">'+ ((contract[i].partner_type==1)?'个人':'公司') +'</td>'+
                '<td class="text-center" data-title="每单分成(元)">'+contract[i].fee_order_per+'</td>'+
                '<td class="text-center" data-title="收入分成(%)">'+contract[i].fee_percent+'</td>'+
                '<td class="text-center tablehandle" data-title="操作">'+
                '<a href="#myModalContract" data-toggle="modal"  class="btn btn-success btn-xs jjfedit"  data-money="'+ contract[i].fee_order_per+'" data-percent="'+ contract[i].fee_percent+'" data-partnerid="'+ contract[i].partner_id+'"  data-roletype="'+ contract[i].role_type+'">编辑</a>'+
                ' <button class="btn btn-danger btn-xs delete" data-partnerid="'+ contract[i].partner_id+'" type="button">删除</button></td> </tr>';
        }
        $('#jjftable').html(html);
    }
    function updateCompanyLogTable(contract) {
        var html = '';
        for(var i=0; i<contract.length; i++){
            html+='<tr>' +
                '<td class="text-center" data-title="#">' + Number(i+1) + '</td>' +
                '<td class="text-center" data-title="时间">' + contract[i].ctime + '</td>'+
                '<td class="text-center" data-title="操作人">' + contract[i].operator + '</td>' +
                '<td class="text-center" data-title="内容">' + contract[i].content + '</td>' +
                '<td class="text-center col-md-3" data-title="原始值">' + (contract[i].original_value ? contract[i].original_value : '--') + '</td>' +
                '<td class="text-center col-md-3" data-title="改变值">' + (contract[i].change_value ? contract[i].change_value : '--') + '</td>' +
                '</tr>'
        }
        $('#company_log').html(html);
    }
    //模糊查询
    $(function () {
        $('#partner').chosen({ //合作方
            width: "100%",
            search_contains: true,    //查询任何地方的词
            allow_single_deselect: true //删除选择的项
        });
        $('#channel').chosen({  //渠道方
            width: "100%",
            search_contains: true,   //查询任何地方的词
            allow_single_deselect: true //删除选择的项
        });
    });

    //居间方 点击个人
   /* $('#typePerson').click(function () {
        $('#typeCompany').removeClass('btn-info');
        $(this).addClass('btn-info');
    });
    //点击公司
    $('#typeCompany').click(function () {
        $('#typePerson').removeClass('btn-info');
        $(this).addClass('btn-info');
    });*/

});