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
            ['Max', 'Mustermann', '1990-02-01T00:00'],
            ['Isaac', 'Asimov', '1999-10-18T00:00'],
            ['Christopher', 'Paolini', '2001-11-21T00:00']
        ];

        let sqlInsertPatient = `INSERT INTO Patients
            (Firstname, Lastname, Birthday)
            VALUES ?`;

        db.query(sqlInsertPatient, [personData], (err, result) => {
            if (err) {
                throw err;
            }
            console.log('Data inserted into Patients table');
        });

        let termineData = [
            ['2025-04-25T10:00', '2025-04-25T10:30', '1'],
            ['2025-04-26T11:00', '2025-04-26T11:30', '2'],
            ['2025-04-27T12:00', '2025-04-27T12:30', '3'],
            ['2025-04-25T10:30', '2025-04-25T11:00', '2'],
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
