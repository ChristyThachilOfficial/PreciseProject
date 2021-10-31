var express = require("express");
var router = express.Router();
var userHelpers = require("../helpers/user-helpers");
var productHelpers = require("../helpers/product-helpers");
const keys = require("../config/keys");
const { parse } = require("handlebars");
const { response } = require("express");
const twilio = require("twilio")(keys.accountsSID, keys.authToken);

var loginHelper = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};
/* GET home page. */
router.get("/", async function (req, res, next) {
  if (req.session.loggedIn) {
    let user = req.session.user;
    let cart = await userHelpers.getCartProduct(req.session.user._id);
    let category=await productHelpers.getAllCategory()
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    productHelpers.getallProducts().then((productsData) => {
      res.render("users/user-home", {
        users: true,
        user: true,
        typeOfPersonUser: true,
        productsData,
        cartCount,
        userrr: req.session.user,
        cart,
        category
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
        category
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
  } else {
    res.render("users/user-login", {
      users: false,
      loginError: req.session.loginErr,
      typeOfPersonUser: true,
    });
    req.session.loginErr = false;
  }
});

//login with otp
router.get("/loginwithotp", (req, res, next) => {
  if (req.session.loginErr) {
    res.render("users/user-loginWithNumber", {
      typeOfPersonUser: true,
      users: false,
      loginError: req.session.loginErr,
    });
    req.session.loginErr = false;
  } else {
    res.render("users/user-loginWithNumber", {
      typeOfPersonUser: true,
      users: false,
    });
  }
});

//post login otp
router.post("/loginwithotp", async (req, res, next) => {
  mob = req.body.countryCode + req.body.mob;
  mobile = parseInt(mob);
  let user = await userHelpers.findUser(req.body.mob);

  if (user) {
    twilio.verify
      .services(keys.ServiceID)
      .verifications.create({ to: "+" + mobile, channel: "sms" })
      .then((verification) => {
        res.render("users/user-loginWithOtpVerify", {
          typeOfPersonUser: true,
          users: false,
          mobilenum: req.body.mob,
          countryCode: req.body.countryCode,
        });
      })
      .catch((err) => {});
  } else {
    req.session.loginErr = true;
    res.redirect("/loginwithotp");
  }
});

//post otp verify
router.post("/loginotp", (req, res, next) => {
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
        userHelpers.findUser(number).then((response) => {
          req.session.user = response;
          req.session.loggedIn = true;
          res.redirect("/");
        });
      } else {
        otpError = true;
        res.render("users/user-loginWithOtpVerify", {
          typeOfPersonUser: true,
          users: false,
          otpError,
        });
        otpError = false;
      }
    });
});

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
      } else {
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
        console.log(userData);
        userHelpers.verifyUser(userData).then((response) => {
          res.redirect("/login");
        });
      } else {
        otpError = true;
        res.render("users/user-signupotp", {
          typeOfPersonUser: true,
          otpError,
        });
        otpError = false;
      }
    });
});

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
    res.render("users/user-forgotpassword", { typeOfPersonUser: true });
  }
});

router.post("/forgotpassword", (req, res, next) => {
  mobile1 = req.body.countryCode + req.body.mob;
  mobile = parseInt(mobile1);
  console.log(mobile);
  userHelpers
    .findNumber(req.body)
    .then((response) => {
      if (response) {
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
        res.render("users/user-otpverify", { typeOfPersonUser: true, mobile });
      }
    })
    .catch((err) => {
      console.log("errv : ", err);
    });
});

router.post("/otpverify", (req, res) => {
  mobile = req.body.num;
  twilio.verify
    .services(keys.ServiceID)
    .verificationChecks.create({ to: "+" + req.body.num, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status);
      if (verification_check.status == "approved") {
        res.render("users/user-changepassword", {
          mobile,
          typeOfPersonUser: true,
        });
      } else {
        otpError = true;
        res.render("users/user-otpverify", {
          typeOfPersonUser: true,
          mobile,
          otpError,
        });
        otpError = false;
      }
    });
});

//product single view
router.get("/singleview/:id", async (req, res, next) => {
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
      });
    });
  } else {
    let proId = req.params.id;
    productHelpers.getProductDetails(proId).then((productDetails) => {
      res.render("users/singleView", {
        users: true,
        typeOfPersonUser: true,
        productDetails,
      });
    });
  }
});

//post change password
router.post("/changepassword", (req, res, next) => {
  let passDetails = req.body;
  let oldDetails = req.session.userRegnum;

  userHelpers
    .changePassword(passDetails, oldDetails)
    .then((response) => {
      if (response) {
        res.redirect("/");
      }
    })
    .catch((err) => {
      console.log("ERRORRRRR : ", err);
    });
});

//add to cart
router.get("/add-to-cart/:id/:price", loginHelper,async (req, res, next) => {
  let brandName = await productHelpers.getBrandName(req.params.id)
 let totalQuantity =await productHelpers.getTotalQuantity(req.params.id)
  userHelpers
    .addToCart(req.params.id, req.session.user._id, req.params.price,totalQuantity,brandName)
    .then(() => {
      res.json({ status: true });
    });
});
 
//get cart product
router.get("/cart", async (req, res, next) => {
  if (req.session.loggedIn) {
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
      });
    } else {
      res.render("users/user-cart", {
        typeOfPersonUser: true,
        user: true,
        users: true,
      });
    }
  } else {
    res.redirect("/login");
  }
});

//change product quantity
router.post("/changeproductquantity", async (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then((response) => {
    console.log("response in user router", response);
    res.json(response);
  });
});

//get payment page
router.get("/checkout", async (req, res, next) => {
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
      cartCount
    });
  } else {
    res.redirect("/login");
  }
});

//post place order

router.post("/place-order",loginHelper, async (req, res, next) => {
  
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = req.body.totalCartPrice
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    products.map((data)=>{
      productHelpers.updateTotalQuantityCart(data)
    })
    if (req.body["paymentMethod"] === "COD") {
      res.json({ codSuccess: true });
    } else {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response);
      });
    }
  });
});

//order success page
router.get("/ordersuccess", loginHelper, (req, res, next) => {
  res.render("users/user-orderSuccess", {
    typeOfPersonUser: true,
    users: true,
    user: true,
    userrrr: req.session.user,
  });
});

//my order list
router.get("/vieworders", loginHelper, async (req, res, next) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id);
  res.render("users/user-myorders", {
    typeOfPersonUser: true,
    users: true,
    user: true,
    userrrr: req.session.user,
    orders,
  });
});

//view order products
router.get("/vieworderproducts/:id", loginHelper, async (req, res, next) => {
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
      orderId
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
  console.log(req.body);
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
      });
    });
});

//edit userprofile
router.post("/updateuserdetails", loginHelper, async (req, res, next) => {
  await userHelpers
    .updateUserProfile(req.body, req.session.user._id)
    .then((id) => {
      let image = req.files.image;
      console.log("what is this id coming here", id);
      image.mv("../ProjectClone22/public/userImages/" + id + ".jpg");
      res.redirect("/profile");
    });
});

//buy now
router.get("/buynow/:id", loginHelper, async (req, res, next) => {
  let product = await productHelpers.getBuyNowProduct(req.params.id);
  let productPrice = parseInt(product.price)
  let address=await userHelpers.getUserAddress(req.session.user._id)
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render("users/user-buynowCheckout", {
    typeOfPersonUser: true,
    users: true,
    user: true,
    product,
    user: req.session.user,
    address,
    cartCount,
    productPrice
  });
});

//buy now place order
router.post("/buyNowplace-order", loginHelper,async (req, res, next) => {
  let product = await productHelpers.getProduct(req.body.proId);
  let totalPrice = req.body.totalfinalPrice;
  userHelpers
    .buyNowplaceOrder(req.body, product,totalPrice)
    .then((orderId) => {
      if (req.body["paymentMethod"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    });
    productHelpers.updateTotalQuantity(req.body.proId).then(()=>{
      alert('hoooooooooooooooooooo')
    })
});

//get invoice
router.get("/invoice/:id", loginHelper, (req, res, next) => {
  userHelpers.findOrder(req.params.id).then((orderDetails) => {
    res.render("users/user-invoice", {
      typeOfPersonUser: true,
      users: true,
      user: true,
      orderDetails
    });
  });
});

//user add address
router.get('/addAddress',loginHelper,async(req,res,next)=>{
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render('users/user-addAddress1',{typeOfPersonUser:true,users:true,user:true,cartCount})
})

//post user address
router.post('/addAddress1',loginHelper,(req,res,next)=>{
 userHelpers.addUserAddress(req.body,req.session.user._id).then(()=>{
   res.redirect('/')
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
      res.render('users/user-shopByBrand',{typeOfPersonUser:true,users:true,user:true,products,category,brandName})
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
      res.render('users/user-forMens',{typeOfPersonUser:true,users:true,user:true,products,category})
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
      res.render('users/user-forWomens',{typeOfPersonUser:true,users:true,user:true,products,category})
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

//logout
router.get("/logout", (req, res, next) => {
  req.session.loggedIn = false;
  res.redirect("/");
});
module.exports = router;
