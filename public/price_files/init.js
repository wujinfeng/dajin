var jsUrl="js/jquery.js, js/jquery.easing.1.3.js, js/jquery.skitter.min.js, js/jquery.haiwon.js, js/css.js"
for( var j=0 ; j < jsUrl.split(",").length; j++ ){
	document.write( '<scr' + 'ipt type="text/javascript" src="/style/'+ jsUrl.split(",")[j] +'"><\/scr' + 'ipt>' ) ;
}
