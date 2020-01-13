const express = require('express');
const app = express();
const config = require('./config');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const neo4j = require('neo4j-driver');

app.use(cors());
app.listen(config.port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
const driver = neo4j.driver(config.DBUrl, neo4j.auth.basic(config.DBUsername, config.DBPassword));

function singleReturn(promise, session, res, del = false) {
    promise.then((result) => {
        session.close();
        console.log(result);
        if (del) {
            res.status(200).send('Phone deleted');

        } else {
            if (result.records.length < 1) {
                res.status(404).send('Not Found');
                return;
            }
            res.status(200).send(JSON.stringify(result.records[0].get(0).properties));
        }

    })
        .catch(err => console.log(err))
}

function multipleReturn(promise, session, res, prod = false) {
    promise.then((result) => {
        session.close();

        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        if (prod) {
            let returnArr = [];
            result.records.map(res => {
                returnArr.push({name: res.get(0).properties.name, price: res.get(0).properties.price});
            });
            res.status(200).send(JSON.stringify(returnArr))
        } else {
            let returnArr = [];
            result.records.map(result => {
                returnArr.push(result.get(0).properties);
            });
            res.status(200).send(JSON.stringify(returnArr))
        }

    })
        .catch(err => console.log(err));

}

app.use('/product-image', express.static('ProductImages'));

app.post('/admin-login', (req, res) => {
    let password = req.body.password;
    let email = req.body.email;
    console.log(req.body);
    const session = driver.session();
    let promise = session
        .run('match (a:Admin {email:{email}, password:{password}}) return a', {email, password});
    singleReturn(promise, session, res);
});

app.post('/add-phone', (req, res) => {
    const {brand, model, audio, charging, bluetooth, admin} = req.body.phone;
    console.log(req.body.phone);
    let queryString = 'match (admin:Admin {email:{admin}}), ';
    if (audio) {
        queryString = queryString.concat('(audio:Connector {type:{audio}}), ')
    }
    if (charging) {
        queryString = queryString.concat('(charging:Connector {type:{charging}}), ')
    }
    if (bluetooth) {
        queryString = queryString.concat('(bluetooth:Connector {type:{bluetooth}}) ')
    }
    queryString = queryString.concat('merge (p:Phone {model:{model}, brand:{brand}})<-[add:added]-(admin) ');
    if (audio) {
        queryString = queryString.concat('merge (p)-[ap:audio]->(audio) ');
    }
    if (charging) {

        queryString = queryString.concat('merge (p)-[cp:charge]->(charging) ');
    }
    if (bluetooth) {

        queryString = queryString.concat('merge (p)-[bt:audio]->(bluetooth) ');
    }
    queryString = queryString.concat('return p');

    let parameters = {charging, bluetooth: 'bluetooth', audio, brand, model, admin};

    const session = driver.session();
    const promise = session
        .run(queryString, parameters);
    singleReturn(promise, session, res);
});

app.post('/delete-phone', (req, res) => {
    const {phone} = req.body;
    const queryString = 'match (a:Phone {brand:{brand}, model:{model}}) detach delete a';
    const params = {brand: phone.brand, model: phone.model};

    const session = driver.session();
    const promise = session
        .run(queryString, params);



    singleReturn(promise, session, res, true);
});
app.post('/seller-login', (req, res) => {
    let password = req.body.password;
    let email = req.body.email;
    const session = driver.session();
    let promise = session
        .run('match (a:Seller {email:{email}, password:{password}}) return a', {email, password});
    singleReturn(promise, session, res);
});

app.get('/seller-products', (req, res) => {
    const {seller} = req.query;
    console.log(seller);
    const queryString = 'match (b:Seller {email:{seller}})-[r:sell]->(a:Product) return a';
    const params = {seller};

    const session = driver.session();
    const promise = session
        .run(queryString, params);

    multipleReturn(promise, session, res, true);

});

app.post('/add-product', (req, res) => {
    const {seller, name, price, connector, image} = req.body.product;
    console.log(req.body);
    let queryString = 'match (s:Seller {name:{seller}}),(c:Connector {type:{connector}}) ';
    queryString = queryString.concat('merge (s)-[r:sell]->(p:Product {name:{name}, image:{image}, price:{price}}) merge (c)<-[d:connects]-(p) return p');
    const params = {seller, name: `${seller} ${name}`, price, connector, image};

    const session = driver.session();
    const promise = session.run(queryString,params);

    singleReturn(promise,session,res);
});

app.post('/delete-product', (req, res) => {
    const {seller, name, image} = req.body.product;
    console.log(req.body);
    let queryString = 'match (p:Product {name:{name}}) detach delete p';
    const params = {name};

    const session = driver.session();
    const promise = session.run(queryString,params);
    const path = `./ProductImages/${image}`;
    try {
        fs.unlinkSync(path)
        //file removed
    } catch(err) {
        console.error(err)
    }
    singleReturn(promise,session,res, true);
});



app.get('/phone-models', (req, res) => {
    const session = driver.session();
    let promise = session
        .run('match (a:Phone) return a');

    multipleReturn(promise, session, res);

});
app.get('/all-ports', (req, res) => {
    const session = driver.session();
    let promise = session
        .run('match (a:Connector) return a');
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let returnArr = [];
        result.records.map(result => {
            returnArr.push(result.get(0).properties);
        });
        res.status(200).send(JSON.stringify(returnArr))
    })
        .catch(err => console.log(err));

});


app.get('/charging-ports', (req, res) => {
    const session = driver.session();
    let promise = session
        .run('match (a:Connector {category: {charge}}) return a', {charge: 'charge'});
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let returnArr = [];
        result.records.map(result => {
            returnArr.push(result.get(0).properties);
        });
        res.status(200).send(JSON.stringify(returnArr))
    })
        .catch(err => console.log(err));


});

app.get('/audio-ports', (req, res) => {
    const session = driver.session();
    let promise = session
        .run('match (a:Connector {category: {audio}}) return a', {audio: 'audio'});
    promise.then((result) => {
        session.close();
        if (result.records.length < 1) {
            res.status(404).send('Not Found');
            return;
        }
        let returnArr = [];
        result.records.map(result => {
            returnArr.push(result.get(0).properties);
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

    const session = driver.session();
    let promise = session
        .run('match (a:Buyer {email:{email}) where id(a)={id} set a.firstName={firstName}, a.lastName={lastName}, a.phone={phone} return a', {
            id,
            firstName,
            lastName,
            email,
            phone
        });
    singleReturn(promise, session, res);
});

app.post('/register', (req, res) => {
    let password = req.body.password;
    let email = req.body.email;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    const session = driver.session();
    let promise = session
        .run('create (a:Buyer {firstName:{firstName}, lastName:{lastName}, email: {email}, password:{password}}) return a', {
            firstName,
            lastName,
            email,
            password
        });
    singleReturn(promise, session, res);
});

app.post('/login', (req, res) => {
    let password = req.body.password;
    let email = req.body.email;

    const session = driver.session();
    let promise = session
        .run('match (a:Buyer {email: $email, password:$password}) return a', {
            email: email,
            password: password
        });
    singleReturn(promise, session, res);
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'ProductImages')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname )
    }
});

const upload = multer({ storage: storage }).single('file');

app.post('/upload-product-image',function(req, res) {

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).json(err)
        } else if (err) {
            return res.status(500).json(err)
        }
        return res.status(200).send(req.file)

    })

});