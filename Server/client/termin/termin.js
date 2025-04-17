fetch('/api/client')
            .then(response => response.json())
            .then(data => {
                if (data.date) {
                    document.getElementById("date").textContent = data.date;
                    //alert(data.date);
                    //alert(data.time);
                    //alert(data.datetime);
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
            });

function speichern() {
                window.location.href = "../calendar/calendar.html";
            }

function abbrechen() {
                window.location.href = "../calendar/calendar.html";
            }
