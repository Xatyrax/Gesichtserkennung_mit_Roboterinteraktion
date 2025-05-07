// fetch('/api/calendar')
//              .then(response => response.json())
//              .then(data => {
document.addEventListener("DOMContentLoaded", async function () {

let response = await fetch('/api/room');
let data = await response.json();

// alert(JSON.stringify(data.roomData));

setRoomInfo('room1',data.roomData[0]);
setRoomInfo('room2',data.roomData[1]);
setRoomInfo('room3',data.roomData[2]);

});

function setRoomInfo(fieldID, roomDbInfo)
{
    document.getElementById(fieldID + "_ID").textContent = String(roomDbInfo.RoomID);
    let Raumstatus = roomDbInfo.Free.data == 1 ? "Frei" : "Belegt";
    document.getElementById(fieldID).textContent = roomDbInfo.RoomName + ":";
    document.getElementById(fieldID + "_Status").textContent = Raumstatus;

    document.getElementById(fieldID + "_ButtonID").onclick = function() {changeStatus_room(roomDbInfo.RoomID)};
}

function back() {
        window.location.href = "../calendar/calendar.html";
};


function changeStatus_room(roomId) {
    // alert(roomId);

    const form = document.createElement('form');
    form.method = "POST";
    form.action = "/api/room";

    addHiddenField(form, 'roomId', roomId);

    document.body.appendChild(form);
    form.submit();
};

//Helper Functions
function addHiddenField(formObj, name, value) {
    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = name;
    hiddenField.value = value;
    formObj.appendChild(hiddenField);
}
