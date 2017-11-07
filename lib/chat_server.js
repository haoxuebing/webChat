var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};


exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    //定义每个用户连接的处理逻辑
    io.sockets.on('connection', function (socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);//在用户连接上来时赋予其一个访问名
        joinRoom(socket, 'Lobby');//在用户连接上来时把他放入聊天室Lobby里
        handleMessageBroadcasting(socket, nickNames);//处理用户的消息 
        handleNameChangeAttempts(socket, nickNames, namesUsed);//更名
        handlerRoomJoining(socket);//处理聊天室的创建和变更

        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.adapter.rooms);//manager.rooms
        });//用户发出请求时，向其他提供已经被占用的聊天室列表
        handleClientDisconnection(socket, nickNames, namesUsed);//定义用户断开连接后的清除逻辑
    })
}

//分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;//生成新昵称
    nickNames[socket.id] = name;//把用户昵称跟客户端连接ID关联上
    socket.emit('nameResult', {
        success: true,
        name: name
    });//让用户知道他们的昵称
    namesUsed.push(name);//存放已被占用的昵称
    return guestNumber + 1;//增加用来生成昵称的计数器
}

//用户加入聊天室相关逻辑
function joinRoom(socket, room) {
    socket.join(room);//用户进入房间
    currentRoom[socket.id] = room;//记录用户当前的房间
    socket.emit('joinResult', { room: room });//让用户知道他们进入了新的房间
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });//让房间的其他用户知道有新的用户加入房间
    var usersInRoom = io.sockets.sockets;//确定有哪些用户在这个房间里
    if (usersInRoom) {//如果不止一个用户在这个房间里，汇总下都是谁
        var usersInRoomSummary = 'Users currently in ' + room + ' : ';
        var names=[];
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                // if (index) {
                //     usersInRoomSummary += ', ';
                // }
                names.push(nickNames[userSocketId]);
                //usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += names.join(',');
        socket.emit('message', { text: usersInRoomSummary });//将房间里其他用户的汇总信息发送给这个用户  
    }
}


//更名请求处理逻辑
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function (name) {//添加nameAttempt时间的监听器
        if (name.indexOf('Guest') == 0) {//昵称不能以Guest开头
            socket.emit('nameResult', {
                success: false,
                message: 'Name cannot begin with "Guest".'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) {//如果昵称没被注册上就注册
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];//删除之前用的昵称，让其他用户可以使用
                socket.emit('nameResult',{
                    success:true,
                    name:name
                })//让用户知道他们的昵称
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName +' is now known as '+name+'.'
                });
            }else{
                //如果昵称已经被占用，给客户端发送错误消息
                socket.emit('nameResult',{
                    success:false,
                    message:'That name is already in use.'
                });
            }
        }
    });
}

//发送聊天信息
function handleMessageBroadcasting(socket){
    socket.on('message',function(message){
        socket.broadcast.to(message.room).emit('message',{
            text:nickNames[socket.id]+': '+message.text
        });
    });
}

//创建房间
function handlerRoomJoining(socket){
    socket.on('join',function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    });
}

//用户断开连接
function handleClientDisconnection(socket){
    socket.on('disconnect',function(){
        var nameIndex=namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}











