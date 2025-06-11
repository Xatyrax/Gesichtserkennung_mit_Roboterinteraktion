// fetch('/api/calendar')
//              .then(response => response.json())
//              .then(data => {
document.addEventListener("DOMContentLoaded", async function () {
            const calendarEl = document.getElementById("calendar");

            let response = await fetch('/api/calendar');
            let data = await response.json();

            //TODO: Conversion Functions
            let arrweekday = String(data.dateOfTheWeek).split("T")[0].split("-");
            let today = new Date(arrweekday[0],arrweekday[1]-1,arrweekday[2],12,0,0);

            let dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            let startOfWeek = new Date(today.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)));

            let endOfWeek = new Date(today);
            endOfWeek.setDate(startOfWeek.getDate()+6);
            // alert(startOfWeek);
            // alert(endOfWeek);
            // if(dayOfWeek == 0){endOfWeek.setDate(startOfWeek.getDate()+6);}
            // else if(dayOfWeek == 1){endOfWeek.setDate(startOfWeek.getDate()+5);}
            // else if(dayOfWeek == 2){endOfWeek.setDate(startOfWeek.getDate()+4);}
            // else if(dayOfWeek == 3){endOfWeek.setDate(startOfWeek.getDate()+3);}
            // else if(dayOfWeek == 4){endOfWeek.setDate(startOfWeek.getDate()+2);}
            // else if(dayOfWeek == 5){endOfWeek.setDate(startOfWeek.getDate()+1);}
            // else if(dayOfWeek == 6){endOfWeek.setDate(startOfWeek.getDate()+0);}

            // alert(endOfWeek);

            //TODO: Conversion Functions
            const startOfWeekShort = startOfWeek.toLocaleDateString("de-DE", {year: 'numeric',  month: '2-digit',  day: '2-digit',});
            const endOfWeekShort = endOfWeek.toLocaleDateString("de-DE", {year: 'numeric',  month: '2-digit',  day: '2-digit',});
            document.getElementById("weekdates").textContent = startOfWeekShort + " - " + endOfWeekShort;

            // Headers: Time + 7 Weekdays
            let headers = ['Time', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
            headers.forEach(text => {
                let div = document.createElement("div");
                div.classList.add("header");
                div.textContent = text;
                calendarEl.appendChild(div);
            });

            // Generate Time Slots (8 AM - 5 PM)


            let hours = [];
            for (let i = data.OeffnungszeitVon; i <= data.OeffnungszeitBis; i++) {
                hours.push(i + ":00");
            }

            // Create the grid
            hours.forEach(hour => {
                // Time slot column
                let timeDiv = document.createElement("div");
                timeDiv.classList.add("time-slot");
                timeDiv.textContent = hour;
                calendarEl.appendChild(timeDiv);

                // 7 Days for the week
                for (let i = 0; i < 7; i++) {
                    let dayDiv = document.createElement("div");
                    dayDiv.classList.add("day");
                    let eventDate = new Date(startOfWeek);
                    eventDate.setDate(startOfWeek.getDate() + i); // Adjust for each day

                    dayDiv.setAttribute("data-date", eventDate.toISOString().split("T")[0]);
                    dayDiv.setAttribute("data-time", hour);

                    dayDiv.addEventListener("click", addEvent);
                    calendarEl.appendChild(dayDiv);
                }
            });

            //alert(`${data.Termine}`);
            JSON.parse(data.Termine).forEach(termin => {

                let startDate = new Date(termin.Start);
                let stDate = startDate.toISOString().split("T")[0];
                let stStartTime = String(startDate.getHours()).padStart(2, '0') + ":" + String(startDate.getMinutes()).padStart(2, '0');
                let stHour = startDate.getHours() + ":00";

                let cell = calendarEl.querySelector(`.day[data-date='${stDate}'][data-time='${stHour}']`);
                if (cell) {
                    let eventEl = document.createElement("div");
                    eventEl.classList.add("event");
                    eventEl.textContent = stStartTime + " Uhr: " + termin.Lastname;
                    eventEl.setAttribute("id", termin.AppointmentID);
                    eventEl.addEventListener("click", TerminBearbeiten);
                    cell.appendChild(eventEl);
                }
            });

});

            function addEvent(e) {
                let date = e.target.getAttribute("data-date");
                let time = e.target.getAttribute("data-time");

                const form = document.createElement('form');
                form.method = "POST";
                form.action = "/api/client";

                const hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = 'date';
                hiddenField.value = date;
                form.appendChild(hiddenField);

                const hiddenField2 = document.createElement('input');
                hiddenField2.type = 'hidden';
                hiddenField2.name = 'time';
                hiddenField2.value = time;
                form.appendChild(hiddenField2);

                document.body.appendChild(form);
                form.submit();
            }

            function TerminBearbeiten(e) {
                e.stopPropagation();
                let id = e.target.getAttribute("id");

                const form = document.createElement('form');
                form.method = "POST";
                form.action = "/api/client";

                const hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = 'id';
                hiddenField.value = id;
                form.appendChild(hiddenField);

                document.body.appendChild(form);
                form.submit();
            }

            function rooms(){
                window.location.href = "../rooms";
            }

            function forward(){
                const form = document.createElement('form');
                form.method = "POST";
                form.action = "/api/calendar";

                const hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = 'forward';
                hiddenField.value = true;
                form.appendChild(hiddenField);

                document.body.appendChild(form);
                form.submit();
            }

            function backward(){
                const form = document.createElement('form');
                form.method = "POST";
                form.action = "/api/calendar";

                const hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = 'forward';
                hiddenField.value = false;
                form.appendChild(hiddenField);

                document.body.appendChild(form);
                form.submit();
            }

