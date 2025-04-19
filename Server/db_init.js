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

    let createTermineTableQuery = `CREATE TABLE Termine (
            TerminID INT AUTO_INCREMENT PRIMARY KEY,
            start DATETIME NOT NULL,
            ende DATETIME NOT NULL,
            dauerMinuten INT NOT NULL
        );`;
    db.query(createTermineTableQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Termine Tabelle erstellt');
    });

    let createPatientenTableQuery = `CREATE TABLE Patienten (
            PatientID INT AUTO_INCREMENT PRIMARY KEY,
            vorname VARCHAR(255) NOT NULL,
            nachname VARCHAR(255) NOT NULL
        );`;
    db.query(createPatientenTableQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Patienten Tabelle erstellt');
    });

    let createBehandlungsräumeTableQuery = `CREATE TABLE Behandlungsräume (
            BehandlungsraumID INT AUTO_INCREMENT PRIMARY KEY,
            frei BIT NOT NULL
        );`;
    db.query(createBehandlungsräumeTableQuery, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Behandlungsräume Tabelle erstellt');
    });

    let personData = [
            ['vor1', 'nach1'],
            ['vor2', 'nach2'],
            ['vor3', 'nach3']
        ];

        let sqlInsertPatient = `INSERT INTO Patienten
            (vorname, nachname)
            VALUES ?`;

        db.query(sqlInsertPatient, [personData], (err, result) => {
            if (err) {
                throw err;
            }
            console.log('Data inserted into Patienten table');
        });

        let termineData = [
            ['2025-04-18 10:00', '2025-04-18 10:30', '30'],
            ['2025-04-19 11:00', '2025-04-19 11:30', '30'],
            ['2025-04-20 12:00', '2025-04-20 12:30', '30']
        ];

        let sqlInsertTermine = `INSERT INTO Termine
            (start, ende, dauerMinuten)
            VALUES ?`;

        db.query(sqlInsertTermine, [termineData], (err, result) => {
            if (err) {
                throw err;
            }
            console.log('Data inserted into Termine table');
        });
//});
