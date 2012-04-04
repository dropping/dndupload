jQuery Dndupload
=============

Requirement
-----------
    1. jquery 1.4+
    2. HTML5


Usage
-----
	$("#dragZone").dndupload({
		params:{
            param1 : 'value1'
        },
        url:'/api/upload',
        maxfiles:100,
        maxfilesize:50*1024*1024
    }).bind("over.dndupload", function(event){
         $(this).addClass("dnd-enter");
    }).bind("out.dndupload", function(event){
	   $(this).removeClass("dnd-enter");
	}).bind("done.dndupload", function(event, data){
	   //show result
	   console.info(data.result);
	   $(this).removeClass("dnd-enter");
	});
    see more in 'demo.html'
