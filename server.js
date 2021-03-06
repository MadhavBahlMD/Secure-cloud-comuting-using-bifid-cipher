const express = require('express');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const Promise = require("bluebird");
const randomstring = require("randomstring");

const secretKey = 'ThisIsServerSecret';

const {signUpMail} = require('./serverFiles/signUpMail');
const {hash} = require('./serverFiles/g_hash');
const {addUser} = require('./serverFiles/addUser');
const {sendMail} = require('./serverFiles/sendMail');
const {existingUser} = require('./serverFiles/findUser');
const {existingUserName} = require('./serverFiles/existingUserName');
const {checkToken} = require('./serverFiles/checkToken');
const {deleteToken} = require('./serverFiles/deleteToken');
const {checkPass} = require('./serverFiles/checkPass');
const {saveSafeData} = require('./serverFiles/saveSafeData');
const {encrypt} = require('./serverFiles/encrypt');

const port = process.env.PORT || 8000;

var app = express();
app.use(bodyParser());
app.set('views', __dirname + '/public');
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'hbs');

/* =========================================== */
/* ===== Temprary route for dev purposes ===== */
/* =========================================== */

app.get('/user', (req, res) => {
    res.render('user.hbs', {
        name: 'Madhav Bahl',
        email: 'madhavbahl10@gmail.com',
        username: 'Madhav',
        savedData: 'SJDWEIFUNWEDULUQWBDQWIWUIRWEFRIWEFNEFW',
        decryptData: 'Hello World, doing some random stuff here'

    });
});

app.get('/out/:me', (req, res) => {
    res.render('logout.hbs', {
        name: req.params.me
    });
});

/* ===== End of user based temprary route ===== */

app.get('/', (req, res) => {
    res.render('index.hbs');
});

app.get('/signup', (req, res) => {
    res.render('login.hbs');
});

app.get('/login', (req, res) => {
    res.render('login.hbs');
});

app.post('/sendMail', (req, res) => {
    console.log(req.body);
    res.send(req.body);
});

app.post('/signup', (req, res) => {
    
    // Set up an object to send mail
    var details = {
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        key: req.body.key,
        pass: req.body.password
    };

    // Hash the password
    var newPass = hash(req.body.password, secretKey);
    var newKey = hash(req.body.key, secretKey);
    req.body.password = newPass;
    req.body.key = newKey;
    var session = randomstring.generate({
        length: 30,
        charset: 'alphabetic'
    });
    console.log(session);
    var session = hash(session, secretKey);
    var token = {};
    token['token'] = session;
    var tokens = [];
    tokens.push(token);
    // console.log(token);
    console.log(tokens);
    req.body['tokens'] = token;
    
    // Check is the entered user already exists in the Database
    existingUser(req.body, (err, result) => {
        if (err) {
            return res.render('login.hbs', {registered: 'Could not connect to the database!'});
        }

        if (result) {
            return res.render('login.hbs', {registered: 'Given User Already Exists. Please Check Again!'});
        } else {
            // Save to the database
            addUser(req.body, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.render('login.hbs', {registered: 'There was some error!'});
                }
                
                // Send a mail to confirm signup
                signUpMail(details,(err,info) => {
                    if (err) {
                        console.log(err);
                        return res.render('login.hbs', {registered: 'There was some error!'});
                    }
                    // res.render('login.hbs', {registered: 'You are registered. Check your email!'});
                    res.render('user.hbs', {
                        name: details.name,
                        email: details.email,
                        username: details.username,
                        savedData: details.safaData
                    });
                });
            });
        }
    }); 
});

app.post('/login', (req, res) => {
    console.log(req.body);
    var newPass = hash(req.body.password, secretKey);
    req.body.password = newPass;
    console.log('New Password is: ', req.body.password);
    checkPass(req.body, (err, response) => {
        if (err) {
            res.render('user.hbs', {registered: err});
        }
        console.log('The response is: ', response);
        res.render('user.hbs', {
            name: response.name,
            email: response.email,
            username: response.username,
            savedData: response.safaData
        });
    })

});

app.get('/user/:me', (req, res) => {
    console.log('Already Login from user: ',req.params.me);
    var username = req.params.me
    existingUserName(username, (err, result) => {
        if (err) {
            res.render('login.hbs', {registered: 'There was some error!'});
        }

        if (result) {
            checkToken (result, (err, doc) => {
                // if (err) {
                //     res.render('login.hbs', {registered: 'There was some error!'});
                // }
                console.log('RESULT: ', doc);
                if (doc) {
                    console.log(doc);
                    res.render('user.hbs', {
                        name: doc.name,
                        username: doc.username,
                        email: doc.email,
                        savedData: doc.safaData
                    });
                } else {
                    res.render('login.hbs', {registered: 'You dont have an active session'});
                }
            });
        } else {
            res.render( 'login.hbs', {
                registered: 'Are you sure you have signed up!?'
            });
        }
    });
});

app.get('/logout/:me', (req, res) => {
    console.log('Logout requested from user: ',req.params.me);
    var username = req.params.me
    existingUserName(username, (err, result) => {
        if (err) {
            res.render('login.hbs', {registered: 'There was some error!'});
        }

        if (result) {
            deleteToken (result, (err, doc) => {
                // if (err) {
                //     res.render('login.hbs', {registered: 'There was some error!'});
                // }
                console.log('RESULT: ', doc);
                if (doc) {
                    console.log('LOGGED OUT!!!!');
                    res.render('logout.hbs', {
                        name: req.params.me
                    });
                } else {
                    res.render('login.hbs', {registered: 'You dont have an active session'});
                }
            });
        } else {
            res.render( 'login.hbs', {
                registered: 'Are you sure you have signed up!?'
            });
        }
    });
});

app.post('/saveData/:me', (req, res) => {
    var username = req.params.me;
    existingUserName(username, (err, result) => {
        if (err) {
            res.render('login.hbs', {registered: 'There was some error!'});
        }

        if (result) {
            result.safeData = req.body.plainText;
            saveSafeData(result, (err, output) => {
                if (err) {
                    res.render('login.hbs', {registered: 'There was some error!'});
                }

                res.render('user.hbs', {
                    name: output.name,
                    email: output.email,
                    username: output.username,
                    savedData: output.safeData
                })
            }); 

        } else {
            res.render( 'login.hbs', {
                registered: 'Are you sure you have signed up!?'
            });
        }
    });
});


app.listen (port, () => {
    console.log(`Server is up on port ${port}`);
})