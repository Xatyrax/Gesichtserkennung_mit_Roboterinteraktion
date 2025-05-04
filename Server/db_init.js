const mysql = require('mysql2');
const db = require('./phandam_modules/dbConnect.js');

    // Drop database if exists
    let dropDatabaseQuery = 'DROP DATABASE IF EXISTS Gesichtserkennung;';
    db.query(dropDatabaseQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Database droped or not existed');
    });

    // Create database
    let createDatabaseQuery = 'CREATE DATABASE Gesichtserkennung';
    db.query(createDatabaseQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Database created or exists');
    });

    let UseDBQuery = "USE Gesichtserkennung";
    db.query(UseDBQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Database changed');
    });

    let createUserQuery = "CREATE USER IF NOT EXISTS 'dbuser'@'localhost' IDENTIFIED BY 'userpw';";
    db.query(createUserQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('User created');
    });

    let alterUserPermissionQuery = "GRANT ALL PRIVILEGES ON Gesichtserkennung.* TO 'dbuser'@'localhost';";
    db.query(alterUserPermissionQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('User permission altered');
    });

    let createPatientenTableQuery = `CREATE TABLE Patients (
            PatientID INT AUTO_INCREMENT PRIMARY KEY,
            Firstname VARCHAR(255) NOT NULL,
            Lastname VARCHAR(255) NOT NULL,
            Sex VARCHAR(1),
            Birthday DATETIME NOT NULL,
            Phone VARCHAR(64),
            Mail VARCHAR(255)
        );`;
    db.query(createPatientenTableQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Patienten Tabelle erstellt');
    });

    let createTermineTableQuery = `CREATE TABLE Appointments (
            AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
            Start DATETIME NOT NULL,
            End DATETIME NOT NULL,
            PatientID INT,
            FOREIGN KEY (PatientID) REFERENCES Patients(PatientID)
        );`;
    db.query(createTermineTableQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Termine Tabelle erstellt');
    });

    let createBehandlungsräumeTableQuery = `CREATE TABLE Behandlungsräume (
            BehandlungsraumID INT AUTO_INCREMENT PRIMARY KEY,
            Free BIT NOT NULL
        );`;
    db.query(createBehandlungsräumeTableQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Behandlungsräume Tabelle erstellt');
    });

    let personData = [
            ['M','Max', 'Mustermann', '1990-02-01T00:00','123 456','mail@mail.com'],
            ['M','Isaac', 'Asimov', '1999-10-18T00:00','123 456','isaac@mail.com'],
            ['M','Christopher', 'Paolini', '2001-11-21T00:00','123 456','mail@paolini.com'],
            ['W','Ulrike', 'Mayer', '1968-06-13T00:00','0831 563450','UlrikeMayer@gmail.com'],
            ['M','Sebastian', 'Fitzek', '2000-12-30T00:00','0176 234890345','SebastianFitzek@gmail.com']
            // ['Alexey', 'Pehov', '1963-09-30T00:00']
        ];

        let sqlInsertPatient = `INSERT INTO Patients
            (Sex, Firstname, Lastname, Birthday,Phone,Mail)
            VALUES ?`;

        db.query(sqlInsertPatient, [personData], (err, result) => {
            if (err) {
                throw err;
            }
            console.log('Data inserted into Patients table');
        });

        let termineData = [
            ['2025-05-07T08:15', '2025-05-07T08:30', '4'],
            ['2025-05-08T15:20', '2025-05-08T16:00', '5'],
            ['2025-05-10T12:00', '2025-05-10T12:30', '1'],
            ['2025-05-11T10:30', '2025-05-11T11:00', '2']
            // ['2025-04-24T09:00', '2025-04-24T09:30', '4']
        ];

        let sqlInsertTermine = `INSERT INTO Appointments
            (Start, End, PatientID)
            VALUES ?`;

        db.query(sqlInsertTermine, [termineData], (err, result) => {
            if (err) {
                throw err;
            }
            console.log('Data inserted into Appointments table');
        });
//});
