const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp();

const config = {
    apiKey: "AIzaSyBbwXnUp6knDTB2QObD9r7pNoLbLqZ4dSE",
    authDomain: "livepartytracker.firebaseapp.com",
    databaseURL: "https://livepartytracker.firebaseio.com",
    projectId: "livepartytracker",
    storageBucket: "livepartytracker.appspot.com",
    messagingSenderId: "768334047244",
    appId: "1:768334047244:web:61460e87399bb020946629",
    measurementId: "G-J3NGPJPZX9"
  };

const express = require('express');
const app = express();

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

app.use(cors());

app.post('/get-alerts', (req, res) => {
    admin
    .firestore()
    .collection('users')
    .doc(req.body.party)
    .collection('alerts')
    .get()
    .then(data => {
        let alerts = [];
        data.forEach(doc => {
            alerts.push({
                color: doc._fieldsProto.color.stringValue,
                name: doc._fieldsProto.name.stringValue
            });
        });
        
        return res.json(alerts);
    })
    .catch (err => console.error(err));
});

app.post('/get-spotify', (req, res) => {
    

    admin
    .firestore()
    .collection('users')
    .doc(req.body.party)
    .get()
    .then(data => {
        
        return res.json(data);
    })
    .catch (err => console.error(err));
});

app.post('/get-party', (req, res) => {
    admin
    .firestore()
    .collection('users')
    .doc(req.body.party)
    .collection('items')
    .get()
    .then(data => {
        let alerts = [];
        data.forEach(doc => {
            alerts.push({
                item: doc._fieldsProto.item.stringValue
            });
        });
        
        return res.json(alerts);
    })
    .catch (err => console.error(err));
});

app.post('/post-item', (req, res) => {
    if( !req.body.party ){
        return res.status(400).json({ error: 'party must not be empty' });
    }

    admin.firestore()
    .collection('users')
    .doc(req.body.party)
    .collection('items')
    .add({ item: req.body.item})
    .then(doc => {
        
        //res.json({message: req.body});
        res.json({ message: 'worked'});
    })
    .catch(err => {
        
        res.status(500).json({ error: 'something went wrong'});
        console.error(err);
    })
});

app.post('/post-alerts', (req, res) => {
    const newAlert = {
        name: req.body.name,
        color: req.body.color,
    };
    if( !req.body.party ){
        return res.status(400).json({ error: 'party must not be empty' });
    }
    admin.firestore()
        .collection('users')
        .doc(req.body.party)
        .collection('alerts')
        .add(newAlert)
        .then(doc => {
            
            res.json({ message: `document ${doc.name} created sucessfully`});
        })
        .catch(err => {
            
            res.status(500).json({ error: 'something went wrong'});
            console.error(err);
        })
});

const isEmail = (email) => {
   const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
   if(email.match(regEx)) return true;
   else return false;
}

const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

app.post('/signup', (req, res) => {
    

    const newUser = {
        email: req.body.email, 
        password: req.body.password,  
        handle: req.body.partycode,
        spotify: req.body.spotify 
    };

    let errors = {};

    if(isEmpty(newUser.email)) {
        errors.email = 'Email must not be empty'
    } else if (!isEmail(newUser.email)){
        errors.email = 'Must be a valid email address'
    }   
    if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists){
                
                return res.status(400).json({ handle: 'this party name is already taken'})
            } else {
                
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idtoken => {
            token = idtoken; 
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                spotiy: newUser.spotify,
                createdAt: new Date().toISOString(),
                userId
            };
            db.doc(`/users/${newUser.handle}`).set(userCredentials);
        }) 
        .then(() => {
            
            return res.status(201).json({ token })
        })
        .catch(err => {
          console.error(err);
          if(err.code === 'auth/email-already-in-use'){
              return res.status(400).json({ email: 'Email is already in use'});    
          } else {
          return res.status(500).json({ error: err.code });
          } 
        });
}); 

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    if(isEmpty(user.email)) errors.email = 'Must not be empty';
    if(isEmpty(user.password)) errors.password = 'Must not be empty';
    
    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            
           return res.json({ token });
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/wrong-password'){
                return res.status(403).json({ general: 'Wrong credentials, please try again' });
            } else return res.status(500).json({ error: err.code });
        });
});
 
exports.api = functions.https.onRequest(app);
