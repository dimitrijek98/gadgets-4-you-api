const express = require('express');
const app = express();
//const config = require('./config');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const neo4j = require('neo4j-driver');

const port = 4000;

app.use(cors());
app.listen(port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '1234'));

app.use('/product-image', express.static('ProductImages'));

app.get('/', (req, res) => {
    const session = driver.session();
    let promise = session
        .run('match (a:Admin) return id(a), a',);
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        console.log(result.records);
        const returnArr = [];
        result.records.forEach((record) => {
            returnArr.push({id: record.get(0).high, ...record.get(1).properties});
        });

        res.status(200).send(JSON.stringify(returnArr));
    })
        .catch(err => console.log(err))
});
app.get('/phone-models', (req, res) => {
    const session = driver.session();
    let promise = session
        .run('match (a:Phone) return a');
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let returnArr = [];
        result.records.map(result => {
            returnArr.push(result.get(0).properties.name);
        });
        res.status(200).send(JSON.stringify(returnArr))
    })
        .catch(err => console.log(err));


});

app.post('/update', (req, res) => {
    let email = req.body.email;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let phone = req.body.phone;
    let id = req.body.id;

    console.log(req.body);
    const session = driver.session();
    let promise = session
        .run('match (a:Buyer) where id(a)={id} set a.firstName={firstName}, a.lastName={lastName}, a.email={email}, a.phone={phone} return id(a), a', {
            id,
            firstName,
            lastName,
            email,
            phone
        });
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let user = {id: result.records[0].get(0).low, ...result.records[0].get(1).properties};
        res.status(200).send(JSON.stringify(user));
    })
        .catch(err => console.log(err));

});

app.post('/register', (req, res) => {
    let password = req.body.password;
    let email = req.body.email;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    const session = driver.session();
    let promise = session
        .run('create (a:Buyer {firstName:{firstName}, lastName:{lastName}, email: {email}, password:{password}}) return id(a), a', {
            firstName,
            lastName,
            email,
            password
        });
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let user = {id: result.records[0].get(0).low, ...result.records[0].get(1).properties};
        res.status(200).send(JSON.stringify(user));
    })
        .catch(err => console.log(err));

});

app.post('/login', (req, res) => {
    let password = req.body.password;
    let email = req.body.email;

    const session = driver.session();
    let promise = session
        .run('match (a:Buyer {email: $email, password:$password}) return id(a),a', {
            email: email,
            password: password
        });
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let user = {id: result.records[0].get(0).low, ...result.records[0].get(1).properties};
        res.status(200).send(JSON.stringify(user));
    })
        .catch(err => console.log(err));
});
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'files')
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' +file.originalname )
//     }
// });
//
// const upload = multer({ storage: storage }).single('file');