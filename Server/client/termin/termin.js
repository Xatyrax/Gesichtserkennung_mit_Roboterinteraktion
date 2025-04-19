document.addEventListener("DOMContentLoaded", async function () {

let response = await fetch('/api/client');
let data = await response.json();

                if(data.eventid)
                {
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
                    document.getElementById("date").textContent = date;
                    document.getElementById("startuhrzeit").value = startTime;
                    document.getElementById("enduhrzeit").value = endTime;
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
                window.location.href = "../calendar/calendar.html";
            }

function abbrechen() {
                window.location.href = "../calendar/calendar.html";
            }
