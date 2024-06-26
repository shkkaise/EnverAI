// jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const bcrypt = require("bcrypt");
// const saltRounds = 6;

const app = express();
// console.log(process.env.SECRET);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "ZuwhxzU@909",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);

mongoose
  .connect("mongodb+srv://admin:ZuwhxzU9@qaismdb.htnsl7n.mongodb.net/userDB")
  .then(() => {
    // mongoose.connect("mongodb://127.0.0.1:27017/userDB").then(() => {
    // mongoose.connect("mongodb://127.0.0.1:27017/userDB").then(() => {
    console.log("Connection to DB successful");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
  });

// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const secret = "ZuwhxzU@909";
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

// const userSchema = {
// email: String,
// password: String
// };

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/enveraiauth",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/enveraiauth",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

// app.get("/secrets", function(req, res) {
// if (req.isAuthenticated()){
// res.render("secrets");
// } else {
// res.redirect('/login');
// }
// });

app.get("/secrets", function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        // console.log(usersWithSecrets);
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  // res.redirect("/login");
  res.redirect("http://127.0.0.1:5500/index.html");
});

// app.get("/logout", (req, res) => {
// req.logout();
// res.redirect("/");
// });

// Below code used for pasport authentication
app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  // console.log(req.user.id);

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});

// Below was used for bcrypt ----
// app.post("/register", function(req, res) {
//
// bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
// const newUser = new User({
// email: req.body.username,
// password: hash
// });
// newUser.save().then(() => {
// res.render("secrets");
// }).catch((err) => {
// console.log(err);
// });
// });
// });
// Above was used for bcrypt ----

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// app.post('/logout', function(req, res, next) {
// req.logout(function(err) {
// if (err) { return next(err); }
// res.redirect('/');
// });
// });

// Below was used for bcrypt ----
// app.post("/login", function(req, res) {
// const username = req.body.username;
// const password = req.body.password;
//
// User.findOne({email: username}, function(err, foundUser){
// if (err) {
// console.log(err);
// } else {
// if (foundUser) {
//
// bcrypt.compare(password, foundUser.password, function(err, result) {
// if (result == true){
// res.render("secrets");
// }
// });
// };
// }
// })
// });
// });
// Above was used for bcrypt ----
// User.findOne({ email: username }).then(user => {
// if (user) {
// res.render("secrets");
// res.send({ message: "User already registered" });
// } else {
// const newUser = new User({
// email: username,
// password: password
// });
//
// newUser.save(err => {
// if (err) {
// res.send(err);
// } else {
// res.send({ message: "Successfully Registered" });
// }
// });
// }
// });

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
