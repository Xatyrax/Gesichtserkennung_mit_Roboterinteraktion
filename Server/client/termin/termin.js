document.addEventListener("DOMContentLoaded", async function () {

let response = await fetch('/api/client');
let data = await response.json();

                if(data.eventid)
                {
                    try{
                    let eventresponse = await fetch('/api/event');
                    let eventdata = await eventresponse.json();

                    let startDateObj = new Date(eventdata.start);
                    let endDateObj = new Date(eventdata.ende);
                    let arrStart = eventdata.start.split("T");

                    //Date
                    let date = arrStart[0];

                    //Starttime
                    let startHour = '';
                    if(startDateObj.getHours().toString().length == 1)
                        startHour = '0' + startDateObj.getHours().toString();
                    else
                        startHour = startDateObj.getHours().toString();
                    let startMinutes = '';
                    if(startDateObj.getMinutes().toString().length == 1)
                        startMinutes = '0' + startDateObj.getMinutes().toString();
                    else
                        startMinutes = startDateObj.getMinutes().toString();
                    let startTime = startHour + ":" + startMinutes;

                    //Endtime
                    let endHour = '';
                    if(endDateObj.getHours().toString().length == 1)
                        endHour = '0' + endDateObj.getHours().toString();
                    else
                        endHour = endDateObj.getHours().toString();
                    let endMinutes = '';
                    if(endDateObj.getMinutes().toString().length == 1)
                        endMinutes = '0' + endDateObj.getMinutes().toString();
                    else
                        endMinutes = endDateObj.getMinutes().toString();
                    let endTime = endHour + ":" + endMinutes;

                    //Gui füllen
                    document.getElementById("eventid").value = data.eventid;
                    document.getElementById("date").textContent = date;
                    document.getElementById("startuhrzeit").value = startTime;
                    document.getElementById("enduhrzeit").value = endTime;
                    }catch(er)
                    {
                        alert(er);
                    }
                }
                else
                {

                    if (data.date) {
                        document.getElementById("date").textContent = data.date;
                    }
                    if (data.datetime) {

                        let datetimeobject = new Date(data.datetime);
                        let hours = String(datetimeobject.getHours()).padStart(2, "0");
                        let minutes = String(datetimeobject.getMinutes()).padStart(2, "0");

                        let startTimeString = `${hours}:${minutes}`;
                        let endTimeString = `${hours}:${String(parseInt(minutes)+data.TermindauerInMinuten).padStart(2, "0")}`;

                        document.getElementById("startuhrzeit").value = startTimeString;
                        document.getElementById("enduhrzeit").value = endTimeString;
                    }
                }

});


function speichern() {

    let eventid = document.getElementById("eventid").value;
    let date = document.getElementById("date").textContent;
    let starttime=document.getElementById("startuhrzeit").value;
    let endtime=document.getElementById("enduhrzeit").value;
    let sex=document.getElementById("geschlecht").value;
    let firstname=document.getElementById("vorname").value;
    let lastname=document.getElementById("nachname").value;
    let birthday=document.getElementById("geburtsdatum").value;
    let phone=document.getElementById("telefon").value;
    let mail=document.getElementById("mail").value;

    // alert (endtime);

    const form = document.createElement('form');
    form.method = "POST";
    form.action = "/api/event";

    addHiddenField(form,'eventid',eventid);
    addHiddenField(form,'date',date);
    addHiddenField(form,'starttime',starttime);
    addHiddenField(form,'endtime',endtime);
    addHiddenField(form,'sex',sex);
    addHiddenField(form,'firstname',firstname);
    addHiddenField(form,'lastname',lastname);
    addHiddenField(form,'birthday',birthday);
    addHiddenField(form,'phone',phone);
    addHiddenField(form,'mail',mail);

    document.body.appendChild(form);
    form.submit();
    // alert (endtime);

    // form.submit();


    // window.location.href = "../calendar/calendar.html";
}

function abbrechen() {
                window.location.href = "../calendar/calendar.html";
            }


//Helper Functions
function addHiddenField(formObj, name, value) {
    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = name;
    hiddenField.value = value;
    formObj.appendChild(hiddenField);
}
