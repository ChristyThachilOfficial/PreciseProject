var express = require("express");
var router = express.Router();
var userHelpers = require("../helpers/user-helpers");
var productHelpers = require("../helpers/product-helpers");
const keys = require("../config/keys");
const { parse } = require("handlebars");
const { response } = require("express");
const { Db } = require("mongodb");
const { token } = require("morgan");
const twilio = require("twilio")(keys.accountsSID, keys.authToken);

var loginHelper = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};
var move_cart = (req,res,next)=>{
  req.session.move_cart = true;
  next()
}

const move_wishlist = (req,res,next)=>{
  req.session.move_wishlist = true;
  next()
}




/* GET home page. */
router.get("/", async function (req, res, next) {
  let offerExpiredBrands =await productHelpers.getAllOfferValidityExpiredBrands()
  
  offerExpiredBrands.map((data)=>{
     
     productHelpers.deleteBrandOffer(data._id,data.brandName).then((brandProducts)=>{
      brandProducts.map((data)=>{
        productHelpers.updatePriceToRealPrice(data)
      })
     
    })
  })

  let offerExpiredProducts = await productHelpers.getAllofferValidityExpiredProducts()
  
  offerExpiredProducts.map((data)=>{
    productHelpers.deleteProductOffer(data._id,data.productName)
  })


  let ExpiredCoupons = await productHelpers.getValidityExpiredCoupons()
  
  ExpiredCoupons.map((data)=>{
    userHelpers.deleteCoupon(data._id)
  })


  let allAds = await productHelpers.getAllAdvertisement()
  if (req.session.loggedIn) {
    let user = req.session.user;
    console.log('where is the user id i want to get that for lobin',req.session.user)
    let cart = await userHelpers.getCartProduct(req.session.user._id);
    let category=await productHelpers.getAllCategory()
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let wishlistProducts = await userHelpers.getWishListProducts(req.session.user._id)
    productHelpers.getallProducts().then((productsData) => {
      console.log(productsData)
      res.render("users/user-home", {
        users: true,
        user: true,
        typeOfPersonUser: true,
        productsData,
        cartCount,
        userrr: req.session.user,
        cart,
        category,
        wishlistProducts,
        allAds
      });
    });
  } else {
    let category=await productHelpers.getAllCategory()
    productHelpers.getallProducts().then((productsData) => {
      res.render("users/user-home", {
        users: true,
        user: false,
        typeOfPersonUser: true,
        productsData,
        category,
        allAds
      });
    });
  }
});

// GET login page
router.get("/login", (req, res, next) => {
  if (req.session.userblock) {
    req.session.loggedIn = false;
    res.render("users/user-login", {
      users: false,
      typeOfPersonUser: true,
      userblock: true,
    });
    req.session.userblock = false;
  } else if (req.session.loggedIn) {
    res.redirect("/");
  }else if(req.session.passwordChanged){
    res.render("users/user-login", {
      users: false,
      loginError: req.session.loginErr,
      typeOfPersonUser: true,
      passwordChangedSuccessfully :true
    });
    req.session.passwordChanged = false
    
  }
   else {
    let token=req.query.token
    if(token=='guestToBuyNow'){
    req.session.guestToBuyNow=true 
    req.session.guestToBuyNowProdId=req.query.prodId
    
  }
  let tokenCart = req.query.tokenCart
  if(tokenCart === 'guestToCart'){
    req.session.guestToCart = true
    req.session.guestToCartDetails = { prodId : req.query.prodId,price:req.query.price}
   
  }
  let tokenWishlist = req.query.tokenWishlist
  if(tokenWishlist === 'guestToWishlist'){
    req.session.guestToWishlist = true
    req.session.guestToWishlistDetails = { prodId :req.query.prodId,price:req.query.price }
  }
    res.render("users/user-login", {
      users: false,
      loginError: req.session.loginErr,
      typeOfPersonUser: true,
    });
    req.session.loginErr = false;
  }
});





//login with otp loginwithotp1
router.get("/loginwithotp", (req, res, next) => {
  console.log('we have reached our first destiny 🚚🚚🚚🚚🚚🚚🚚🚚🚚🚚🚚🚚🚚🚚🚚')
  if (req.session.loginErr) {
    res.render("users/user-loginWithNumber", {
      typeOfPersonUser: true,
      users: false,
      loginError: req.session.loginErr,
      
    });
    req.session.loginErr = false;
  }else if(req.session.userblock){
    res.render("users/user-loginWithNumber", {
      typeOfPersonUser: true,
      users: false,
      userblock:true
    });
    req.session.userblock = false
  } else {
    res.render("users/user-loginWithNumber", {
      typeOfPersonUser: true,
      users: false,
    });
  }
});

//post login otp loginwithotp2 here twilio gets the user number
router.post("/loginwithotp", async (req, res, next) => {
  console.log('we have reached to our second destiny 😎😎😎😎😎😎😎😎😎😎😎😎😎😎😎😎😎')
  mob = req.body.countryCode + req.body.mob;
  mobile = parseInt(mob);
  let user = await userHelpers.findUser(req.body.countryCode,req.body.mob);
  if (user) {
    if(user.block === 'false'){
      req.session.userblock = true;
      res.redirect('/loginwithotp')
    }else if(user.block === 'true'){
      req.session.userMobileNumber = {countryCode : user.countryCode  , number :user.number}
     let countryCode = req.session.userMobileNumber.countryCode
     let number = req.session.userMobileNumber.number
      twilio.verify
      .services(keys.ServiceID)
      .verifications.create({ to: "+" + mobile, channel: "sms" })
      .then((verification) => {
        res.render("users/user-loginWithOtpVerify", {
          typeOfPersonUser: true,
          users: false,
          countryCode,
          number
        });
      })
      .catch((err) => {});
    }
    
  } else{
    req.session.loginErr = true;
    res.redirect("/loginwithotp");
  }
});





//post otp verify loginwithotp3 here the user send his otp 
router.post("/loginotp", (req, res, next) => {
  console.log('this is our final destiny....................❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️')
  let otp = req.body.otp;
  let countryCode = req.body.countryCode;
  let number = req.body.num;
  let mobNum = parseInt(countryCode + number);
  twilio.verify
    .services(keys.ServiceID)
    .verificationChecks.create({ to: "+" + mobNum, code: otp })
    .then((verification_check) => {
      console.log(verification_check.status);
      if (verification_check.status == "approved") {
        userHelpers.findUser(countryCode,number).then((response) => {
          req.session.userMobileNumber = false
          req.session.user = response;
          req.session.loggedIn = true;
          res.redirect("/");
        });
      } else {
        console.log('user daaaaaaaaaaaaaata njn sessionill eduthu njan arrrrrrra mwo',req.session.userMobileNumber)
        let countryCode = req.session.userMobileNumber.countryCode
        let number = req.session.userMobileNumber.number
        otpError = true;
        res.render("users/user-loginWithOtpVerify", {
          typeOfPersonUser: true,
          users: false,
          otpError,
          countryCode,
          number
        });
        otpError = false;
      }
    });
});


//resend otp
router.get('/resend_OTP',(req,res,next)=>{
  if(req.session.loggedIn){
    res.redirect('/')
  }else{
  let countryCode = req.session.userMobileNumber.countryCode
  let number = req.session.userMobileNumber.number
  let mobile = parseInt(req.session.userMobileNumber.countryCode + req.session.userMobileNumber.number)
  twilio.verify
      .services(keys.ServiceID)
      .verifications.create({ to: "+" + mobile, channel: "sms" })
      .then((verification) => {
        res.render("users/user-loginWithOtpVerify", {
          typeOfPersonUser: true,
          users: false,
          countryCode,
          number
        });
      })
      .catch((err) => {});
  }
  

})

//POST login page
router.post("/login", async (req, res, next) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      console.log("block status", req.session.user.block);
      if (req.session.user.block == "false") {
        req.session.userblock = true;
        res.redirect("/login");
      }else if (req.session.move_cart){
        res.redirect("/cart");
        req.session.move_cart = false
      }else if(req.session.move_wishlist){
        res.redirect('/wishlist') 
        req.session.move_wishlist = false
      }else if(req.session.guestToBuyNow)
      { 
        res.redirect('/buynow/'+req.session.guestToBuyNowProdId)
      }else if( req.session.guestToCart){
        res.redirect('/add-to-cart/'+req.session.guestToCartDetails.prodId+'/'+req.session.guestToCartDetails.price)
      }else if(req.session.guestToWishlist){
        res.redirect('/wishlist/'+req.session.guestToWishlistDetails.prodId+'/'+req.session.guestToWishlistDetails.price)
      }
       else {
        req.session.userblock = false;
        res.redirect("/");
      }
    } else {
      req.session.loginErr = true;
      res.redirect("/login");
    }
  });
});

//remove from cart
router.post("/removeproductcart", (req, res, next) => {
  userHelpers.removeFromCart(req.body).then((response) => {
    if (response.removedProduct) {
      res.json(response);
    }
  });
});

//POST signup page
router.post("/signup", (req, res, next) => {
  let countrycode = req.body.countryCode;
  let mob = req.body.number;
  mobilenum = parseInt(countrycode + mob);

  userHelpers.doSignup(req.body).then((response) => {
    if (response == false) {
      req.session.signupError = true;
      res.redirect("/signup");
    } else {
      req.session.newUser = req.body;
      console.log("req.session.userRegnum", mobilenum);
      twilio.verify
        .services(keys.ServiceID)
        .verifications.create({ to: "+" + mobilenum, channel: "sms" })
        .then((verification) => {
          console.log(verification.status);
          res.render("users/user-signupotp", {
            typeOfPersonUser: true,
            users: false,
          });
        })
        .catch((err) => {
          console.log("the error is", err);
        });
    }
  });
});

//post signup otp page
router.post("/signupotp", (req, res, next) => {
  let userData = req.session.newUser;
  let mobileNum = parseInt(
    req.session.newUser.countryCode + req.session.newUser.number
  );

  console.log("userData and otp is :", mobileNum);
  twilio.verify
    .services(keys.ServiceID)
    .verificationChecks.create({ to: "+" + mobileNum, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status);
      if (verification_check.status == "approved") {
        
        userHelpers.verifyUser(userData).then((response) => {
          res.redirect("/login");
        });
      } else {
        otpError = true;
        res.render("users/user-signupotp", {
          typeOfPersonUser: true,
          otpError,
          countryCode : req.session.newUser.countryCode,
          number: req.session.newUser.number
        });
        otpError = false;
      }
    });
});


//resend signup otp
router.get('/resend_OTP_signup',(req,res,next)=>{
  let   countryCode = req.session.newUser.countryCode
  let   number = req.session.newUser.number

  let mobilenum = parseInt(countryCode + number )


  twilio.verify
  .services(keys.ServiceID)
  .verifications.create({ to: "+" + mobilenum, channel: "sms" })
  .then((verification) => {
    console.log(verification.status);
    res.render("users/user-signupotp", {
      typeOfPersonUser: true,
      users: false,
    });
  })
  .catch((err) => {
    console.log("the error is", err);
  });
})

//GET signup page
router.get("/signup", (req, res, next) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("users/user-signup", {
      signupError: req.session.signupError,
      typeOfPersonUser: true,
    });
    req.session.signupError = false;
  }
});

//GET forgot password
router.get("/forgotpassword", (req, res, next) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    if(req.session.userNumberNotFound){
      res.render("users/user-forgotpassword", { typeOfPersonUser: true, userNumberNotFound:true });
      req.session.userNumberNotFound = false
    }else if(req.session.userblock){
      res.render("users/user-forgotpassword", { typeOfPersonUser: true, userblock:true });
      req.session.userblock = false
    } else{
      res.render("users/user-forgotpassword", { typeOfPersonUser: true });
    }
    
  }
});

router.post("/forgotpassword", (req, res, next) => {
  mobile1 = req.body.countryCode + req.body.mob;
  userHelpers
    .findNumber(req.body)
    .then((response) => {
      if (response) {
        if(response.block == 'false'){
          req.session.userblock = true;
          res.redirect('/forgotpassword')
        }else if(response.block == 'true'){
        req.session.userMobileNumber = {countryCode : response.countryCode  , number :response.number}
        let countryCode = req.session.userMobileNumber.countryCode
        let number = req.session.userMobileNumber.number
        let mobile = parseInt( countryCode + number)
        req.session.userRegnum = response;
        console.log(req.session.userRegnum);
        console.log(response);
        twilio.verify
          .services(keys.ServiceID)
          .verifications.create({ to: "+" + mobile, channel: "sms" })
          .then((verification) => console.log(verification.sid))
          .catch((err) => {
            console.log("Teh err is : ", err);
          });
        res.render("users/user-otpverify", { typeOfPersonUser: true, countryCode , number });
        }
        
      }else{
        req.session.userNumberNotFound = true
        res.redirect('/forgotpassword')
      }
    })
    .catch((err) => {
      console.log("errv : ", err);
    });
});

router.post("/otpverify", (req, res) => {
  let countryCode = req.session.userMobileNumber.countryCode
  let number = req.session.userMobileNumber.number
  let mobile = parseInt( countryCode + number)
  twilio.verify
    .services(keys.ServiceID)
    .verificationChecks.create({ to: "+" + mobile, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status);
      if (verification_check.status == "approved") {
        res.render("users/user-changepassword", {
          countryCode,
          number,
          typeOfPersonUser: true,
        });
      } else {
        
        otpError = true;
        res.render("users/user-otpverify", {
          typeOfPersonUser: true,
          countryCode,
          number,
          otpError
        });
        otpError = false;
      }
    });
});

//resend otp password change
router.get('/resend_OTP_CHANGEPASSWORD',(req,res,next)=>{
  let countryCode = req.session.userMobileNumber.countryCode
  let number = req.session.userMobileNumber.number
  let mobile = parseInt(req.session.userMobileNumber.countryCode + req.session.userMobileNumber.number)
  twilio.verify
  .services(keys.ServiceID)
  .verifications.create({ to: "+" + mobile, channel: "sms" })
  .then((verification) => console.log(verification.sid))
  .catch((err) => {
    console.log("Teh err is : ", err);
  });
res.render("users/user-otpverify", { typeOfPersonUser: true, countryCode , number });
  
})

//product single view
router.get("/singleview/:id", async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  if (req.session.loggedIn) {
    let proId = req.params.id;
    let cart = await userHelpers.getCartProduct(req.session.user._id);
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    productHelpers.getProductDetails(proId).then((productDetails) => {
      res.render("users/singleView", {
        users: true,
        user: true,
        typeOfPersonUser: true,
        productDetails,
        cartCount,
        cart,
        user: req.session.user,
        category
      });
    });
  } else {
    let proId = req.params.id;
    productHelpers.getProductDetails(proId).then((productDetails) => {
      res.render("users/singleView", {
        users: true,
        typeOfPersonUser: true,
        productDetails,
        category
      });
    });
  }
});

//post change password
router.post("/changepassword", (req, res, next) => {
  let passDetails = req.body;
  let mobile = req.session.userMobileNumber.number;

  userHelpers
    .changePassword(passDetails,mobile )
    .then((response) => {
      if (response) {
        req.session.passwordChanged = true
        res.redirect("/login");
      }
    })
    .catch((err) => {
      console.log("ERRORRRRR : ", err);
    });
});

//add to cart
router.get("/add-to-cart/:id/:price", loginHelper,async (req, res, next) => {
 if( req.session.guestToCart){
  let brandName = await productHelpers.getBrandName(req.params.id)
  let totalQuantity =await productHelpers.getTotalQuantity(req.params.id)
  req.session.guestToCart = false
   userHelpers
     .addToCart(req.params.id, req.session.user._id, req.params.price,totalQuantity,brandName)
     .then(() => {
       res.redirect('/cart');
     });
 }else{
  let brandName = await productHelpers.getBrandName(req.params.id)
 let totalQuantity =await productHelpers.getTotalQuantity(req.params.id)
  userHelpers
    .addToCart(req.params.id, req.session.user._id, req.params.price,totalQuantity,brandName)
    .then(() => {
      res.json({ status: true });
    });
 }
  
});
 
//get cart product
router.get("/cart",move_cart,loginHelper, async (req, res, next) => {
  req.session.move_cart=false
  let category=await productHelpers.getAllCategory()
  
    let cartCount = await userHelpers.getCartCount(req.session.user._id);

    let products = await userHelpers.getCartProduct(req.session.user._id);
    if (products) {
      let totalCartPrice = await userHelpers.getAllCartamount(
        req.session.user._id
      );
      res.render("users/user-cart", {
        typeOfPersonUser: true,
        user: true,
        users: true,
        products,
        cartCount,
        totalCartPrice,
        category
      });
    } else {
      res.render("users/user-cart", {
        typeOfPersonUser: true,
        user: true,
        users: true,
        category
      });
    }
 
});

//change product quantity
router.post("/changeproductquantity",loginHelper, async (req, res, next) => {
  
  userHelpers.changeProductQuantity(req.body).then(async(response) => {
    let totalCartPrice = await userHelpers.getAllCartamount(req.session.user._id)
    response.grandTotal = totalCartPrice
    res.json(response);
  });
});

//get payment page
router.get("/checkout", async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  if (req.session.loggedIn) {
    let totalCartPrice = await userHelpers.getAllCartamount(
      req.session.user._id
    );
    let address=await userHelpers.getUserAddress(req.session.user._id)
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
   
    res.render("users/user-payment", {
      typeOfPersonUser: true,
      user: true,
      users: true,
      totalCartPrice,
      user: req.session.user,
      address,
      cartCount,
      category
    });
  } else {
    res.redirect("/login");
  }
});

//post place order

router.post("/place-order",loginHelper, async (req, res, next) => {
  console.log('the place orderllllllllllllllllllllllllllllll',req.body)
  
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = req.body.totalCartPrice
  req.session.cart = true
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    products.map((data)=>{
      productHelpers.updateTotalQuantityCart(data)
    })
    if (req.body["paymentMethod"] === "COD") {
      res.json({ codSuccess: true });
    }else if(req.body["paymentMethod"] === "paypal"){
      userHelpers.generatePaypal(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
     else{
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response);
      });
    }
    
  });
});

//order success page
router.get("/ordersuccess", loginHelper, async(req, res, next) => {
  let category=await productHelpers.getAllCategory()
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  if(req.session.cart){
    userHelpers.deleteCartProducts(req.session.user._id)
  }

  res.render("users/user-orderSuccess", {
    typeOfPersonUser: true,
    users: true,
    user: true,
    userrrr: req.session.user,
    category,
    cartCount
  });
});

//my order list
router.get("/vieworders", loginHelper, async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  let orders = await userHelpers.getUserOrders(req.session.user._id);
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  console.log(orders)
  res.render("users/user-myorders", {
    typeOfPersonUser: true,
    users: true,
    user: true,
    userrrr: req.session.user,
    orders,
    category,
    cartCount
  });
});

//view order products
router.get("/vieworderproducts/:id", loginHelper, async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let orderId = req.params.id;
  let order =await userHelpers.findOrder(orderId)
  if (order.mode ==='cart') {
    let products = await userHelpers.getOrderProducts(orderId);
    res.render("users/user-orderproducts", {
      typeOfPersonUser: true,
      users: true,
      user: true,
      userrrr: req.session.user,
      products,
      cart:true,
      orderId,
      category,
      cartCount
    });
  }else if (order.mode === 'buynow') {
    let products = await productHelpers.buyNowProduct(orderId)
    res.render("users/user-orderProducts",{
      typeOfPersonUser: true,
      users: true,
      user: true,
      userrrr: req.session.user,
      products,
      buynow:true,
      orderId
    })
  }

 
});

//verify router
router.post("/verify-payment", (req, res, next) => {
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("payment successfull");
        res.json({ status: true });
      });
    })
    .catch((err) => {
      console.log("error is", err);
      res.json({ status: false });
    });
});

//userprofile
router.get("/profile", loginHelper, async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let userDetails = userHelpers
    .getUserDetails(req.session.user._id)
    .then((userData) => {
      res.render("users/user-profile", {
        typeOfPersonUser: true,
        users: true,
        user: true,
        userData,
        cartCount,
        category
      });
    });
});

//edit userprofile
router.post("/updateuserdetails", loginHelper, async (req, res, next) => {
  await userHelpers
    .updateUserProfile(req.body, req.session.user._id)
    .then((id) => {
      if(req.files){
        let image = req.files.image;
      console.log("what is this id coming here", id);
      image.mv("../ProjectClone22/public/userImages/" + id + ".jpg");
      res.redirect("/profile");
      }else{
        res.redirect("/profile");
      }
      
    });
});

//buy now
router.get("/buynow/:id", loginHelper, async (req, res, next) => {
  let product = await productHelpers.getBuyNowProduct(req.params.id);
  let productPrice = parseInt(product.price)
  let address=await userHelpers.getUserAddress(req.session.user._id)
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let category=await productHelpers.getAllCategory()
  res.render("users/user-buynowCheckout", {
    typeOfPersonUser: true,
    users: true,
    user: true,
    product,
    user: req.session.user,
    address,
    cartCount,
    productPrice,
    category
  });
});

//buy now place order
router.post("/buyNowplace-order", loginHelper,async (req, res, next) => {
  let product = await productHelpers.getProduct(req.body.proId);
  let totalPrice = req.body.totalfinalPrice;
  req.session.cart =false
  userHelpers
    .buyNowplaceOrder(req.body, product,totalPrice)
    .then((orderId) => {
     
      if (req.body["paymentMethod"] === "COD") {
        res.json({ codSuccess: true });
      } else if(req.body["paymentMethod"] === "Razorpay"){
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }else{
        userHelpers.generatePaypal(orderId,totalPrice).then((response)=>{
          res.json(response)
        })
      }
    });
    productHelpers.updateTotalQuantity(req.body.proId)
});

//get invoice
router.get("/invoice/:id", loginHelper, async(req, res, next) => {
  let category=await productHelpers.getAllCategory()
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  userHelpers.findOrder(req.params.id).then((orderDetails) => {
    res.render("users/user-invoice", {
      typeOfPersonUser: true,
      users: true,
      user: true,
      orderDetails,
      category,
      cartCount
    });
  });
});

//user add address
router.get('/addAddress',loginHelper,async(req,res,next)=>{
  let category=await productHelpers.getAllCategory()
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let address=await userHelpers.getUserAddress(req.session.user._id)
  if (req.session.limitExceeded) {
    res.render('users/user-addAddress1',{typeOfPersonUser:true,users:true,user:true,cartCount,category,address,addressLimitExceeded:true})
    req.session.limitExceeded=false
  }else{
    res.render('users/user-addAddress1',{typeOfPersonUser:true,users:true,user:true,cartCount,category,address})
  }
  
})

//delete user address
router.get('/deleteAddress/:addressId',loginHelper,(req,res,next)=>{
  userHelpers.deleteAddress(req.params.addressId).then(()=>{
    res.json({status:true})
  })
})

//edit user address
router.get('/editAddress/:addressId',loginHelper,async(req,res,next)=>{
  let category=await productHelpers.getAllCategory()
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let address =await userHelpers.getUserAddressToEdit(req.params.addressId)
  res.render('users/user-editAddress',{typeOfPersonUser:true,users:true,user:true,address,category,cartCount})
})


//post edit address
router.post('/editAddress',loginHelper,(req,res,next)=>{
  let addressId = req.body.addressId
  userHelpers.updateUserAddress(addressId,req.body).then(()=>{
    res.redirect('/addAddress')
  })
})
//post user address
router.post('/addAddress1',loginHelper,(req,res,next)=>{
 userHelpers.addUserAddress(req.body,req.session.user._id).then((response)=>{
   if(response.limitExceeded){
     req.session.limitExceeded = true
     res.redirect('/addAddress')
   }else{
    res.redirect('/addAddress')
   }
   
 })

})

//shop by brand
router.get('/shopbybrand/:name',async(req,res,next)=>{
  let category=await productHelpers.getAllCategory()
  let brandName=req.params.name
  if(req.session.loggedIn){
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let cart = await userHelpers.getCartProduct(req.session.user._id);
    productHelpers.findProductByBrand(req.params.name).then((products)=>{
     
      res.render('users/user-shopByBrand',{typeOfPersonUser:true,users:true,user:true,products,userrr:req.session.user,cartCount,cart,category,brandName})
    })
  }else{
    productHelpers.findProductByBrand(req.params.name).then((products)=>{
      res.render('users/user-shopByBrand',{typeOfPersonUser:true,users:true,user:false,products,category,brandName})
    })
  }

 
})

//shop for men's
router.get('/formens',async(req,res,next)=>{
  let category=await productHelpers.getAllCategory()
  if (req.session.loggedIn) {
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let cart = await userHelpers.getCartProduct(req.session.user._id);
    productHelpers.getMensProduct().then((products)=>{
      res.render('users/user-forMens',{typeOfPersonUser:true,users:true,user:true,products,userrr:req.session.user,cartCount,cart,category})
    })
  }else{
    productHelpers.getMensProduct().then((products)=>{
      res.render('users/user-forMens',{typeOfPersonUser:true,users:true,user:false,products,category})
    })
  }

})


//shop for women's
router.get('/forwomens',async(req,res,next)=>{

  let category=await productHelpers.getAllCategory()
  if (req.session.loggedIn) {
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let cart = await userHelpers.getCartProduct(req.session.user._id);
    productHelpers.getWomensProduct().then((products)=>{
      res.render('users/user-forWomens',{typeOfPersonUser:true,users:true,user:true,products,userrr:req.session.user,cartCount,cart,category})
    })
  }else{
    productHelpers.getWomensProduct().then((products)=>{
      res.render('users/user-forWomens',{typeOfPersonUser:true,users:true,user:false,products,category})
    })
  }
})

//cancel order buy now
router.post('/cancelOrderBuyNow',loginHelper,(req,res,next)=>{
  let productId = req.body.prodId
  let status = req.body.status
  let orderId = req.body.orderId
  userHelpers.cancelOrderBuyNow(productId,status,orderId).then((response)=>{
    res.json({status:true})
  })
})

//cancel order cart
router.post('/cancelOrderCart',loginHelper,async(req,res,next)=>{
  let productId =req.body.proId
  let status = req.body.status
  let orderId = req.body.orderId
  let orderedproducts =  await userHelpers.getOrderProducts(orderId);
  userHelpers.cancelOrderCart(productId,status,orderId).then(()=>{
    orderedproducts.map((data)=>{
      productHelpers.updateTotalQuantityInCart(data)
    })
    res.json({status:true})
  })
})

//coupon checking
router.get('/checkCoupon/:couponCode/:productPrice',loginHelper,(req,res,next)=>{
  userHelpers.checkCouponExistBuyNow(req.params.couponCode,req.params.productPrice,req.session.user._id).then((response)=>{
    if (response) {
      res.json(response)
    }
  })
})

//coupon checking cart
router.get('/checkCouponCart/:couponCode/:cartPrice',loginHelper,(req,res,next)=>{
  userHelpers.checkCouponExistCart(req.params.couponCode,req.params.cartPrice,req.session.user._id).then((response)=>{
    if(response){
      res.json(response)
    }
  })
})


//wishlist
router.get('/wishlist/:prodId/:prodPrice',loginHelper,(req,res,next)=>{
  if(req.session.guestToWishlist){
    req.session.guestToWishlis = false
    userHelpers.addToWishlist(req.params.prodId,req.session.user._id,req.params.prodPrice).then((response)=>{
      res.redirect('/wishlist')
    })
  }else{
    userHelpers.addToWishlist(req.params.prodId,req.session.user._id,req.params.prodPrice).then((response)=>{
    
      res.json(response)
    })
  }
  
})

//get wishlist
router.get('/wishlist',move_wishlist,loginHelper,async(req,res,next)=>{
  req.session.move_wishlist =false;
  let category=await productHelpers.getAllCategory()
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
 let wishListProducts = await userHelpers.getWishListProducts(req.session.user._id)
 let cart = await userHelpers.getCartProduct(req.session.user._id);
 
  res.render('users/user-wishlist',{typeOfPersonUser:true,users:true,user:true,wishListProducts,category,cartCount,cart})
})

//delete wishlist product
router.get('/deleteWishlistProduct/:productId',loginHelper,(req,res,next)=>{
  userHelpers.deleteWishlistProduct(req.params.productId,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

//get total orders
router.get('/totalOrders',loginHelper,(req,res,next)=>{
  productHelpers.getOrderedProductsByStatus().then((orderlist)=>{
    console.log(orderlist)
    res.render('users/user-totalOrders',{typeOfPersonUser:true,users:true,user:true,orderlist})
  })
 
})

//paypal currency converter cart
router.post('/currencycoverterCart/:amount',(req,res)=>{  
  userHelpers.convertAmount(req.params.amount).then((total)=>{
    res.json(total)
  })
})

//user product search
router.get('/getSearchProducts/:text',(req,res,next)=>{
  productHelpers.findSearchProducts(req.params.text).then((searchResult)=>{
    console.log(searchResult)
    res.json(searchResult)
  })
})


//error page
router.get('/errorPage',(req,res,next)=>{
  res.render('users/404',{typeOfPersonUser:true})
})

//logout
router.get("/logout", (req, res, next) => {
  req.session.loggedIn = false;
  res.redirect("/");
});
module.exports = router;
