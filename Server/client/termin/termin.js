document.addEventListener("DOMContentLoaded", async function () {

let response = await fetch('/api/client');
let data = await response.json();

                if(data.userInputError)
                {
                    document.getElementById("fehler").textContent = data.userInputError.message;
                    document.getElementById("eventid").value = data.userInputError.InputedData.eventid;
                    document.getElementById("date").textContent = data.userInputError.InputedData.date;
                    document.getElementById("startuhrzeit").value = data.userInputError.InputedData.starttime;
                    document.getElementById("enduhrzeit").value = data.userInputError.InputedData.endtime;
                    document.getElementById("geschlecht").value = data.userInputError.InputedData.sex;
                    document.getElementById("vorname").value = data.userInputError.InputedData.firstname;
                    document.getElementById("nachname").value = data.userInputError.InputedData.lastname;
                    document.getElementById("geburtsdatum").value = data.userInputError.InputedData.birthday.substring(0, 10);
                    document.getElementById("telefon").value = data.userInputError.InputedData.phone;
                    document.getElementById("mail").value = data.userInputError.InputedData.mail;
                }
                else if(data.eventid)
                {
                    try{
                    let eventresponse = await fetch('/api/event');
                    let eventdata = await eventresponse.json();

                    let startDateObj = new Date(eventdata.start);
                    let endDateObj = new Date(eventdata.ende);
                    let arrStart = eventdata.date.split("T");

                    //Date
                    let arrEventdate = String(eventdata.date).split("T")[0].split("-");
                    let eventdate = new Date(arrEventdate[0],arrEventdate[1]-1,arrEventdate[2],12,0,0);
                    let date = eventdate.toLocaleDateString("de-DE", {year: 'numeric',  month: '2-digit',  day: '2-digit',});


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

                    //Patientendaten
                    let arrbithday = String(eventdata.geburtstag).split("T")[0].split("-");
                    let birthday = new Date(arrbithday[0],arrbithday[1]-1,arrbithday[2],12,0,0);

                    //Gui füllen
                    document.getElementById("eventid").value = data.eventid;
                    document.getElementById("date").textContent = date;
                    document.getElementById("startuhrzeit").value = startTime;
                    document.getElementById("enduhrzeit").value = endTime;
                    document.getElementById("geschlecht").value = eventdata.geschlecht;
                    document.getElementById("vorname").value = eventdata.vorname;
                    document.getElementById("nachname").value = eventdata.nachname;
                    document.getElementById("geburtsdatum").value = birthday.toISOString().substring(0, 10);
                    document.getElementById("telefon").value = eventdata.telefon;
                    document.getElementById("mail").value = eventdata.mail;

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

    let arrdate = date.split(".");
    let year = arrdate[2];
    let month = arrdate[1];
    let day = arrdate[0];
    date = year + "-" + month + "-" + day;

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

function loeschen() {

    let eventid = document.getElementById("eventid").value;

    const form = document.createElement('form');
    form.method = "POST";
    form.action = "/api/event";

    addHiddenField(form, 'delete', true);
    addHiddenField(form,'eventid',eventid);

    document.body.appendChild(form);
    form.submit();


}


//Helper Functions
function addHiddenField(formObj, name, value) {
    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = name;
    hiddenField.value = value;
    formObj.appendChild(hiddenField);
}
