/**
 * Created by Administrator on 2017-07-18.
 */
//规格参数 弹出框
$('.goodsmain').click(function () {
    layer.open({
        type: 1,
        title: false,  //不显示标题
        shade: 0.5,
        shadeClose:true,
        area:['auto'],
        content:  $(this).next('.alert-inside'),  //捕获的元素，注意：最好该指定的元素要存放在body最外层，否则可能被其它的相对元素所影响
        cancel: function(){
            /*layer.msg('捕获就是从页面已经存在的元素上，包裹layer的结构', {time: 5000, icon:6});*/
        }
    });
});

//左侧导航栏
$('#fold > .model.close').hover(function () {
    $(this).find('.dh').stop().slideDown();
},function () {
    $(this).find('.dh').stop().slideUp();
});