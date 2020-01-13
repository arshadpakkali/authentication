//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const md5 =  require('md5')
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
///
const session =  require('express-session');
const passport =  require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

/////////////////////////////////////////////


const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
    secret: 'my fucking secret',
    resave: false,
    saveUninitialized: false,
  }))

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://arshadpakkali:8952@cluster0-if7xm.mongodb.net/authDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set('useCreateIndex',true)

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret:String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://tranquil-ocean-79471.herokuapp.com/auth/google/secrets",
    userProfileURL:'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
      
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
  res.render("home");
});

app.get('/auth/google',passport.authenticate('google',{scope:['profile']} ))


app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
    User.register({username:req.body.username},req.body.password,(err)=>{
        if(err) console.log(err)
        else {
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets')
            })
        }
    })
});

app.post("/login", (req, res) => {
    
    const user = new User({
        username:req.body.username,
        password:req.body.password 
    })
    req.login(user,(err)=>{
        if(err) console.log(err)
        else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets');
            })
        }
    })


});

app.get('/secrets',(req,res)=>{
   User.find({'secret':{$ne:null}},(err,foundUsers)=>{
       if(err) console.log(err)
       else{
           if(foundUsers){
               res.render('secrets',{usersWithSecrets:foundUsers})
           }
       }
   })
})

app.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
})

app.get('/submit',(req,res)=>{
    if(req.isAuthenticated()){
        res.render('submit');
    }else{
        res.redirect('/login');
    }
})

app.post('/submit',(req,res)=>{
    const submittedSecret = req.body.secret;
    User.findById(req.user.id,(err,response)=>{
        if(err)console.log(err)
        else{
            response.secret = submittedSecret;
            response.save(()=>res.redirect('/secrets'))
        }
    })

})
let port = process.env.PORT;
if(port === null || port ==""){
  port = 3000;
}

app.listen(port, () => console.log("server started"));
