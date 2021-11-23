 var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var exhbs=require('express-handlebars')
var db=require('./config/connection')
var session=require('express-session')
var fileUpload = require('express-fileupload')
var helper= require('handlebars-helpers')()
var Handlebars=require('handlebars')


var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');

var app = express();
var hbs=exhbs.create({ extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/',
helpers:helper
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine)
app.use(fileUpload())

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret:"Key",cookie:{maxAge:1200000}}))
db.connect((err)=>{
  if(err){
    console.log('connection error')
  }else{
    console.log('database connected to port 27017')
  }
})
app.use('/', usersRouter);
app.use('/admin', adminRouter);
Handlebars.registerHelper('hello',function(context,options,price){

  for(key in context){
 
    if(options.toString() === context[key].item.toString()){
      var inp=true;
      break;
    }else{
      var inp = false  
    }
  }
  if (inp===true) {
    var data =`<a href="/cart" class="btn btn-primary mt-3" style="width: 80%;">View cart</a>`
  }else{
    var data=`<a onclick="addToCart('${options}','${price}')" class="btn btn-primary mt-3" style="width: 80%; color: white;">Add to cart</a>`
  }
  return data
});

Handlebars.registerHelper('wishlistADDtocart',function(context,options,price){

  for(key in context){
 
    if(options.toString() === context[key].item.toString()){
      var inp=true;
      break;
    }else{
      var inp = false  
    }
  }
  if (inp===true) {
    var data =`<a href="/cart" style="width: 101px;" class="btn btn-primary mt-2" >View cart</a>`
  }else{
    var data=`<a style="width: 101px;" onclick="addToCart('${options}','${price}')" class="btn btn-primary mt-2 text-white"  ">Add to cart</a>`
  }
  return data
});

Handlebars.registerHelper('checkArrayLengthPDF',function(array){
  if(array.length >= 1){

    return data = '<button class="btn btn-success" onclick="getPdf()">Download PDF</button>'
    
  }
})

Handlebars.registerHelper('checkArrayLengthXLS',function(array){
  if(array.length >= 1){
    return data = '<button class="btn btn-success" onclick="getspreadSheet()">Download XLS</button>'
  }
})



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log("The error is  : ",err.message);
  res.render('error');
});

module.exports = app;
