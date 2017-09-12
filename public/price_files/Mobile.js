$(document).ready(function(){
$.formValidator.initConfig({formID:"myform",theme:'include',onError:function(msg){alert(msg)},onSuccess:function(){document.myform.submit();skload();},inIframe:true});
//短信验证
 $("#codeMobile").formValidator({onShow:"请输入短信验证码!",onFocus:"请输入短信验证码!",onCorrect:" 验证成功！ "}).inputValidator({min:1,onError:"请输入短信验证码!"})
	    .ajaxValidator({
	    type : "get",
				url : skpath+"include/Form/index.asp?A=yzsms",
		datatype : "json",
		success : function(data){	
             if( data == "1" )
			{
			    document.getElementById('codeMobilespan').style.display="none";
                return true;
			}
            else
			{
                return false;
			}},	 
		buttons: $("#button"),
		error: function(){alert(wrong);},
        onError:"短信验证码错误!",
		onwait : "正在验证中..."
	});	

 $("#name").formValidator({onShow:"请填写您的姓名",onFocus:"请填写您的姓名",onCorrect:"正确",onShowText:"请填写您的姓名"}).inputValidator({min:2,max:8,onError:"请输入您的真实姓名"}); 
 
 $("#Mobile").formValidator({onShow:"请填写您的手机号码",onFocus:"请输入你的手机号码",onCorrect:"手机号码正确"}).inputValidator({min:11,max:11,onError:"请输入一个正确的手机号码"}); 
 	$("#Email").formValidator({onShowFixText:"6~18个字符，包括字母、数字、下划线，以字母开头，字母或数字结尾",onShow:"请输入邮箱",onFocus:"邮箱6-100个字符,输入正确了才能离开焦点",onCorrect:"恭喜你,你输对了",defaultValue:"@"}).inputValidator({min:6,max:100,onError:"你输入的邮箱长度非法,请确认"}).regexValidator({regExp:"^([\\w-.]+)@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.)|(([\\w-]+.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(]?)$",onError:"你输入的邮箱格式不正确"});

  
 $("#Code").formValidator({onShow:"请输入验证码!",onFocus:"请输入验证码!",onCorrect:" 验证成功！ "}).inputValidator({min:1,onError:"请输入验证码!"})
	    .ajaxValidator({
	    type : "get",
				url : skpath+"include/Form/index.asp?A=yzcode",
		datatype : "json",
		success : function(data){	
             if( data == "1" )
			{
				    document.getElementById('IMG1').style.display="none";
                return true;
			}
            else
			{
                return false;
			}},	 
		error: function(){alert(wrong);},
        onError:"验证码错误!",
		onwait : "正在验证中..."
	});	
		
}); 


 
 
 //短信验证码发送程序 
var InterValObj; //timer变量，控制时间
var count = 80; //间隔函数，1秒执行
var curCount;//当前剩余秒数
var codeLength = 6;//验证码长度

function sendMessage() {
if(document.getElementById('Mobile').value=="")	
	{
alert("请先填写手机号码!");
	} 
else {
	
$("#btnSendCode").removeClass("class1");
$("#btnSendCode").addClass("class2");
            curCount = count;
            //设置button效果，开始计时
                $("#btnSendCode").attr("disabled", "true");
                $("#btnSendCode").val(curCount + "秒后重新发送");
                InterValObj = window.setInterval(SetRemainTime, 1000); //启动计时器，1秒执行一次
//向后台发送处理数据
                $.ajax({
                    type: "get", //用POST方式传输
                    dataType: "json", //数据格式:JSON
     url: 'include/Form/index.asp', //目标地址
                    data: "A=sendsms&M="+document.getElementById('Mobile').value,
                    error: function (XMLHttpRequest, textStatus, errorThrown) { },
                    success: function (msg){ }
                });
            }
			
}	
        //timer处理函数
function SetRemainTime() {
            if (curCount == 0) {                
                window.clearInterval(InterValObj);//停止计时器
                $("#btnSendCode").removeAttr("disabled");//启用按钮
                $("#btnSendCode").val("重新发送验证码");
                code = ""; //清除验证码。如果不清除，过时间后，输入收到的验证码依然有效    
            }
            else {
                curCount--;
                $("#btnSendCode").val(curCount + "秒后重新发送");
            }
        }