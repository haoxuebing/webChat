function divEscapedContentElement(messgae) {
    return $('<div></div>').text(messgae);
}

function divSystemContentElement(messgae) {
    if (message.length > 0) {
        return $('<div></div>').html('<i>' + JSON.stringify(message) + '</i>');
    }
}

function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;
    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#message').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);//将非命令输入广播给其他用户
        $('#message').append(divEscapedContentElement(message));
        $('#message').scrollTop($('#message').prop('scrollHeight'));
    }
    $('#send-message').val('');
}

var socket = io.connect();
$(document).ready(function () {
    var chatApp = new Chat(socket);
    socket.on('nameResult', function (result) {//显示更名尝试的结果
        var message;
        if (result.success) {
            message = 'You are now known as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#message').append(divEscapedContentElement(message));
    });
    socket.on('joinResult', function (result) {//显示房间变化结果
        $('#room').text(result.room);
        $('#message').append(divSystemContentElement('Room changed .'));
    });
    socket.on('message', function (message) {
        var newElement = $('<div></div>').text(message.text);
        $('#message').append(newElement);
    });
    socket.on('rooms', function (rooms) {//显示可用房间列表
        $("#room-list").empty();
        for (var room in rooms) {
            room = room.substring(0, room.length);
            if (room != '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }
        $('#room-list div').click(function () { //点击房间名可以切换到那个房间
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').focus();
        });
    });

    //定期请求可用房间信息列表
    setInterval(function () {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    //提交表单可以发送聊天信息
    $('#send-form').submit(function () {
        processUserInput(chatApp, socket);
        return false;
    });
});
