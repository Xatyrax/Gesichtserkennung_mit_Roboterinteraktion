// fetch('/api/calendar')
//              .then(response => response.json())
//              .then(data => {
document.addEventListener("DOMContentLoaded", async function () {
            const calendarEl = document.getElementById("calendar");

            // Get the start of the current week (Monday)
            let today = new Date();
            let dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            let startOfWeek = new Date(today.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)));

            // Headers: Time + 7 Weekdays
            let headers = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            headers.forEach(text => {
                let div = document.createElement("div");
                div.classList.add("header");
                div.textContent = text;
                calendarEl.appendChild(div);
            });

            // Generate Time Slots (8 AM - 5 PM)
            let response = await fetch('/api/calendar');
            let data = await response.json();

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

                let startDate = new Date(termin.start);
                let dateStr = startDate.toISOString().split("T")[0];
                let hourStr = startDate.getHours() + ":00";

                let cell = calendarEl.querySelector(`.day[data-date='${dateStr}'][data-time='${hourStr}']`);
                if (cell) {
                    let eventEl = document.createElement("div");
                    eventEl.classList.add("event");
                    eventEl.textContent = 'Test';
                    eventEl.setAttribute("id", termin.TerminID);
                    eventEl.addEventListener("click", TerminBearbeiten);
                    cell.appendChild(eventEl);
                }
                //alert(`${JSON.stringify(termin)}`);
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
        });
