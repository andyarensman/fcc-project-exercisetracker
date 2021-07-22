const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser')


const uri = process.env['DB_FITNESS']

mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

var exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

var userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

var Session = mongoose.model('Session', exerciseSessionSchema)
var User = mongoose.model('User', userSchema)

mongoose.set('useFindAndModify', false);

app.post('/api/users', bodyParser.urlencoded({ extended: false }), (req, res) => {
  var newUser = new User({username: req.body.username})
  newUser.save((error, savedUser) => {
    if (!error) {
      var responseObject = {};
      responseObject['username'] = savedUser.username
      responseObject['_id'] = savedUser.id
      res.json(responseObject)
    }
  })
})

app.get('/api/users', (req, res) => {
  User.find({}, (error, arrayOfUsers) => {
    if (!error) {
      res.json(arrayOfUsers)
    }
  })
})

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req, res) => {
  var newSession = new Session({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })
  
  if (newSession.date === '') {
    newSession.date = new Date().toISOString().substring(0, 10)
  }
  
  User.findByIdAndUpdate( 
    req.params._id,
    {$push : {log: newSession}},
    {new: true},
    (error, updatedUser) => {
      if(!error) {
        var responseObject = {}
        responseObject['_id'] = updatedUser.id
        responseObject['username'] = updatedUser.username
        responseObject['date'] = new Date(newSession.date).toDateString()
        responseObject['duration'] = newSession.duration
        responseObject['description'] = newSession.description
        res.json(responseObject)
      }
    }
  )
})

app.get('/api/users/:_id/logs', (req, res) => {
  console.log(req.params)
  console.log(req.query.from)
  
  User.findById(req.params._id, (error, result) => {
    if(!error) {
      var responseObject = result
      
      if (req.query.from || req.query.to) {
        
        var fromDate = new Date(0)
        var toDate = new Date()

        if (req.query.from) {
          fromDate = new Date(req.query.from)
        }

        if (req.query.to) {
          toDate = new Date(req.query.to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        responseObject.log = responseObject.log.filter((session) => {
          var sessionDate = new Date(session.date).getTime()

          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }

      if (req.query.limit) {
        responseObject.log = responseObject.log.slice(0, req.query.limit)
      }


      responseObject = responseObject.toJSON()
      responseObject['count'] = result.log.length
      res.json(responseObject)
    }
  })
  //res.json({})
})