const fixedValues = require('../../phandam_modules/fixedValues.js');

module.exports = function(app) {
app.get("/api/calendar", (req, res) => {
  console.log("api calendar");
        res.json({ OeffnungszeitVon: fixedValues.OeffnungszeitVon, OeffnungszeitBis: fixedValues.OeffnungszeitBis});
})

app.get("/api/client", (req, res) => {
  if (req.session.date) {
        res.json({ date: req.session.date,  time: req.session.time, datetime: req.session.datetime, TermindauerInMinuten: fixedValues.TermindauerInMinuten});
    } else {
        //res.json({ date: '' });
        res.json({ date: fixedValues.NotUsedVariableString });
    }
  // res.redirect("/client/termin");
})

app.post("/api/client", (req, res) => {
  let date = req.body.date;
  let time = req.body.time;
  console.log(time);
  console.log(date);
  if(time.split(':')[0].length == 1)
    time = '0'+time;
  var datetimestring = "1970-01-01T" + time.padStart(2, "0") +":00";
  var datetime = new Date(datetimestring);
  if (date) {
        req.session.date = date;
    } else {
      //Todo konstante felder in Datei
        req.session.date = fixedValues.NotUsedVariableString;
    }

      if (time) {
        req.session.time = time;
    } else {
        req.session.time = fixedValues.NotUsedVariableString;
    }

    if (datetime) {
        req.session.datetime = datetime;
    } else {
        req.session.datetime = fixedValues.NotUsedVariableString;
    }

    res.redirect("/termin");
})
};
