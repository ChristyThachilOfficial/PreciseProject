var db = require("../config/connection");
var collection = require("../config/collection");
const bcrypt = require("bcrypt");
var objectId = require("mongodb").ObjectId;
const { response } = require("express");
const Razorpay = require("razorpay");
const { resolve } = require("path");
const axios = require('axios')
var paypal = require('paypal-rest-sdk')
const ACCESS_KEY= process.env.CURRENCY_CONVERTER_ACCESS_KEY
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEYID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET
});


module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      let userEmail = await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .findOne({ email: userData.email });
      let userNum = await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .findOne({ number: userData.number });

      if (userEmail == null && userNum == null) {
        resolve();
      } else {
        resolve(false);
      }
    });
  },
  findUser: (userCountryCode,userMobile) => {
    return new Promise(async(resolve, reject) => {
       let user =  await
        db.get()
        .collection(collection.USER_COLLECTIONS)
        .findOne({$and : [ {number: userMobile  } , {countryCode :userCountryCode}]})
        
       
        if(user){
         resolve(user)
        }else{
          resolve(false)
        }
         
    });
  },
  verifyUser: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      userData.repassword = await bcrypt.hash(userData.repassword, 10);
      db.get()
        .collection(collection.USER_COLLECTIONS)
        .insertOne(userData)
        .then((response) => {
          resolve(response);
        });
    });
  },
  blockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .updateOne({ _id: objectId(userId) }, { $set: { block: "true" } })
        .then(() => {
          resolve();
        });
    });
  },

  unblockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .updateOne({ _id: objectId(userId) }, { $set: { block: "false" } })
        .then(() => {
          resolve();
        });
    });
  },

  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      let users = db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .find()
        .toArray();
      resolve(users);
    });
  },
  removeFromCart: (product) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(product.cart) },
          { $pull: { products: { item: objectId(product.product) } } }
        )
        .then((response) => {
          resolve({ removedProduct: true });
        });
    });
  },

  doLogin: (userData) => {
    let loginStatus = false;
    let response = {};
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            resolve({ status: false });
          }
        });
      } else {
        resolve({ status: false });
      }
    });
  },
  addToCart: (proId, userId, prodPrice,totalProductQuantity,brandName) => {
    let proObj = {
      item: objectId(proId),
      Quantity: 1,
      price: parseInt(prodPrice),
      totalprice: parseInt(prodPrice),
      status:'Placed',
      totalQuantity:parseInt(totalProductQuantity),
      brand:brandName
      
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(proId) },
              {
                $inc: { "products.$.Quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve(response);
            });
        }
      } else {
        let cartobj = {
          user: objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartobj)
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  getCartProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              Quantity: "$products.Quantity",
              price: "$products.price",
              totalprice: "$products.totalprice"
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              Quantity: 1,
              price: 1,
              totalprice: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      if (cartItems[0]) {
        for (key in cartItems){
          product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(cartItems[key].item)})
          db.get().collection(collection.CART_COLLECTION).updateOne({products:{$elemMatch:{item:objectId(product._id)}}},{
            $set:{
             'products.$.price':product.price,
             'products.$.totalprice':cartItems[key].Quantity * product.price
            }
          }).then(()=>{
            resolve(cartItems)
          })
        }
        
      } else {
        resolve(false);
      }
    });
  },

 
  getCartProductForChecking: (userId) => {
    return new Promise(async (resolve, reject) => {
      var cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .find({ user: objectId(userId) })
        .toArray();
      resolve(cart);
    });
  },
  findNumber: (userNum) => {
    
    return new Promise(async (resolve, reject) => {
      userNumber = await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .findOne({$and :[{countryCode:userNum.countryCode},{number: userNum.mob}]});
        
        
      if (userNumber) {
        resolve(userNumber);
      } else {
        resolve(false);
      }
    });
  },



  //ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
  changePassword: (userData, mobile) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);

      var dataUpdated = await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .updateOne(
          { number: mobile },
          { $set: { password: userData.password } }
        );
      resolve(dataUpdated);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        count = userCart.products.length;
      }

      resolve(count);
    });
  },
  changeProductQuantity: (details) => {
    details.Quantity = parseInt(details.Quantity);

    details.count = parseInt(details.count);
    details.price = parseInt(details.price);

    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.Quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else if (details.count == -1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: {
                "products.$.Quantity": details.count,
                "products.$.totalprice": details.price * -1,
              },
            }
          )
          .then((response) => {
            resolve(response);
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: {
                "products.$.Quantity": details.count,
                "products.$.totalprice": details.price,
              },
            }
          )
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  /////////////////////////////////////////////////////////////////////////////////////////
  getProductPrice: () => {
    return new Promise((resolve, reject) => {
      return new Promise((resolve, reject) => {
        let status = order.paymentMethod === "COD" ? "placed" : "pending";
        let orderObj = {
          deliveryDetails: {
            firstname: order.firstname,

            lastname: order.lastname,
            housename: order.housename,
            streetaddress: order.streetaddress,
            address: order.address,
            town: order.town,
            state: order.state,
            zipcode: order.zipcode,
            phone: order.phone,
            regnum: order.regnum,
            altnum: order.altnum,

            coupon: order.coupon,
          },
          userId: objectId(order.userId),
          paymentMethod: order.paymentMethod,
          products: products,
          status: status,
          date: new Date().toISOString().slice(0,10),
          // when there is some errors check here
          totalAmount: total,
        };

        //im putting an inserted id over here
        db.get()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(orderObj)
          .then((response) => {
            db.get()
              .collection(collection.CART_COLLECTION)
              .deleteOne({ user: objectId(order.userId) });
            resolve(response.insertedId);
          });
      });
    });
  },
  /////////////////////////////////////////////////////////////////////////////////////
  getAllCartamount: (userData) => {
    return new Promise(async (resolve, reject) => {
      let totalCartPrice = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userData) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              Quantity: "$products.Quantity",
              price: "$products.price",
              totalprice: "$products.totalprice",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              Quantity: 1,
              price: 1,
              totalprice: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              totalcartprice: { $sum: "$totalprice" },
            },
          },
        ])
        .toArray();

      if (totalCartPrice[0]) {
        resolve(totalCartPrice[0].totalcartprice);
      } else {

        resolve();
      }
    });
  },
  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      let status = order.paymentMethod === "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          firstname: order.firstname,
          lastname: order.lastname,
          housename: order.housename,
          streetaddress: order.streetaddress,
          address: order.address,
          town: order.town,
          state: order.state,
          zipcode: order.zipcode,
          phone: order.phone,
          regnum: order.regnum,
          altnum: order.altnum,

          
        },
        coupon: order.coupon,
        userId: objectId(order.userId),
        paymentMethod: order.paymentMethod,
        products: products,
        status: status,
        date: new Date().toISOString().slice(0,10),
        // when there is some errors check here
        totalAmount: total,
        mode:'cart'
      };

      //im putting an inserted id over here
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          resolve(response.insertedId);
        });
    });
  },

  //deleting the cart products after order success
  deleteCartProducts:(userId)=>{
     db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(userId) }).then(()=>{
              resolve()
            });
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) })

      resolve(cart.products);
    });
  },
  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId) }).sort({date:1})
        .toArray();
      resolve(orders);
    });
  },

  //this is tos
  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              Quantity: "$products.Quantity",
              price: "$products.price",
              totalprice: "$products.totalprice",
              status:"$products.status"
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              Quantity: 1,
              price: 1,
              totalprice: 1,
              status:1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
        
      resolve(orderItems);
    });
  },
  generatePaypal:(orderId,total)=>{
    totalPrice = parseFloat(total).toFixed(2)
    return new Promise((resolve,reject)=>{
      var create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": 'http://localhost:8000/test',
            "cancel_url": "http://cancel.url"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": orderId,
                    "sku": "item",
                    "price": parseInt(totalPrice),
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": parseInt(totalPrice),
            },
            "description": "The Payement success"
        }]
    };
    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            
            reject(false);
        } else {
            
            resolve(payment)
        }
    });
    })
  },
  
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
        } else {
          resolve(order);
        }
      });
    });
  },
  verifyPayment: (details) => {
   
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "EjgkpT60XJNQQgBvrvqJVWDn");
      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  getUserDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTIONS)
        .findOne({ _id: objectId(userId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  updateUserProfile: (userData, userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTIONS)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              surname: userData.surname,
              address1: userData.address1,
              address2: userData.address2,
              pincode: userData.pincode,
              state: userData.state,
              area: userData.area,
              country: userData.country,
            },
          }
        )
        .then((response) => {
          resolve(userId);
        });
    });
  },
  getOrderList: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .sort({_id:-1})
        .toArray();
      resolve(orders);
    });
  },
  buyNowplaceOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      let status = order.paymentMethod === "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          firstname: order.firstname,
          lastname: order.lastname,
          housename: order.housename,
          streetaddress: order.streetaddress,
          address: order.address,
          town: order.town,
          state: order.state,
          zipcode: order.zipcode,
          phone: order.phone,
          regnum: order.regnum,
          altnum: order.altnum,
         
        },
        coupon: order.coupon,
        userId: objectId(order.userId),
        paymentMethod: order.paymentMethod,
        productId:products._id,
        productname: products.productname,
        brand:products.brand,
        price:products.price,
        description:products.description,

        // buy now mode editing
        mode:'buynow',
        status: status,
        date: new Date().toISOString().slice(0,10),
        // when there is some errors check here
        totalAmount: total,
      };

      //im putting an inserted id over here
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          resolve(response.insertedId);
        });
    });
  },

  //find order
  findOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectId(orderId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  getOrderStatus:(orderId)=>{
    return new Promise(async(resolve,reject)=>{
      await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)}).then((order)=>{
        resolve(order.status)
      })
    })
  },
  addUserAddress:(addressData,userId)=>{
    let addressDetails={
      userId:userId,
      address:addressData
    }
    return new Promise(async(resolve,reject)=>{
      let totalAddressOfUser = await db.get().collection(collection.ADDRESS_COLLECTION).find({userId:userId}).count()
      if (totalAddressOfUser < 2) {
        await db.get().collection(collection.ADDRESS_COLLECTION).insertOne(addressDetails).then((response)=>{
          resolve(response)
        })
      }else{
        let addressCount ={}
        addressCount.limitExceeded ='true'
        resolve(addressCount)
      }
      
    })
  },
  deleteAddress:(addressId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ADDRESS_COLLECTION).deleteOne({_id:objectId(addressId)}).then(()=>{
        resolve()
      })
    })
  },
  getUserAddress:(personId)=>{
    return new Promise(async(resolve,reject)=>{
     let addressData =  await db.get().collection(collection.ADDRESS_COLLECTION).find({userId:personId}).toArray()
     resolve(addressData)
    })
  },
  changeOrderStatus:(proId,orderId,status)=>{
    
    return new Promise(async(resolve,reject)=>{
      let order= await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
      if (order.mode==='cart') {
        db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId),products:{$elemMatch:{item:objectId(proId)}}},
      {
        $set:{
          "products.$.status":status
        }
      }).then(()=>{
        resolve({buynowStatusUpdate:true})
      })
      }else if (order.mode==='buynow') {
        db.get().collection(collection.ORDER_COLLECTION).updateOne({productId:objectId(proId)},{$set:{status:status}}).then(()=>{
          resolve({cartStatusUpdate:true})
        })
      }
      
    })
  },
  getUsersCount:()=>{
    return new Promise(async(resolve,reject)=>{
      db.get().collection(collection.USER_COLLECTIONS).find().count().then((count)=>{
        resolve(count)
      })
    })
  },
  cancelOrderBuyNow:(productId,status,orderId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
      {
        $set:{status:'cancelled'}
      }
      ).then((response)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(productId)},
        {
          $inc:{quantity:1}
        }
        )
        resolve(response)
      })
    })
  },
  cancelOrderCart:(productId,status,orderId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId),products:{$elemMatch:{item:objectId(productId)}}},
      {
        $set:{"products.$.status":'cancelled'}
      }
      ).then(()=>{
        resolve()
      })
    })
  },
  addCoupons:(couponData)=>{
    
    return new Promise(async(resolve,reject)=>{
      let coupon= await db.get().collection(collection.COUPON_COLLECTION).findOne({coupon:couponData.coupon})
      if(coupon){
        isCouponExists ={}
        isCouponExists.yesItExists='true'
        resolve(isCouponExists)
        

       
      }else{
       
        db.get().collection(collection.COUPON_COLLECTION).insertOne(couponData).then(()=>{
          let isCouponExists ={}
          isCouponExists.notExists='true'
          resolve(isCouponExists)
        })
      }
      
    })
  },
  getAllCoupons:()=>{
    return new Promise(async(resolve,reject)=>{
     await db.get().collection(collection.COUPON_COLLECTION).find().toArray().then((coupons)=>{
       resolve(coupons)
     })
    })
  },
  deleteCoupon:(couponId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.COUPON_COLLECTION).deleteOne({_id:objectId(couponId)}).then(()=>{
        resolve()
      })
    })
  },
  checkCouponExistBuyNow:(couponCode,productPrice,userId)=>{
    
    return new Promise(async(resolve,reject)=>{
      let coupon= await db.get().collection(collection.COUPON_COLLECTION).findOne({coupon:couponCode})
     if (coupon) {
      let couponCheckingInOrder = await db.get().collection(collection.ORDER_COLLECTION).findOne({userId:objectId(userId),coupon:coupon.coupon})
      if (couponCheckingInOrder === null) {
       var couponSuccess = {}
       couponSuccess.discountPrice =(productPrice*coupon.percentage)/100
       couponSuccess.finalPrice = productPrice - ((productPrice*coupon.percentage)/100)

       resolve(couponSuccess)
      }else{
        let userUsedCoupon ={}
        userUsedCoupon.usedCoupon = 'true'
        resolve(userUsedCoupon)
      }
       
     }else{
       let validCoupon = {}
       validCoupon.InvalidCoupon ='true'
       resolve(validCoupon)
     }
    })
  },

  checkCouponExistCart:(couponCode,cartPrice,userId)=>{
    return new Promise(async(resolve,reject)=>{
      let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({coupon:couponCode})
      if(coupon){
        
        let isCouponUsed = await db.get().collection(collection.ORDER_COLLECTION).findOne({userId:objectId(userId),coupon:coupon.coupon})
        if(isCouponUsed === null){
          let couponSuccess ={}
          couponSuccess.discountPrice = (cartPrice * coupon.percentage)/100
          couponSuccess.finalPrice = cartPrice - ((cartPrice * coupon.percentage)/100)
          resolve(couponSuccess)
          
        }else{
          let couponUsed={}
          couponUsed.used='true'
          resolve(couponUsed)
        }
      }else{
        let invalidCoupon ={}
        invalidCoupon.invalid='true'
        resolve(invalidCoupon)
      }
    })
  },
  //wishlist
  addToWishlist:(prodId,userId,prodPrice)=>{
    
    
    return new Promise(async(resolve,reject)=>{
      let addedProduct = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)})
      addedProduct.price =parseInt(addedProduct.price)
      let userWishlistProductExists = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({user:objectId(userId)})
      if(userWishlistProductExists){
        let isWishlistProductAlreadyExists =await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
         {
          $match:{user:objectId(userId)}
         },
         {
           $unwind:"$wishListProduct"
         },
         {
           $project:{
             _id:"$wishListProduct._id"
           }
         },
         {
           $match:{_id:objectId(prodId)}
         }
        ]).toArray()
        
       if(isWishlistProductAlreadyExists[0]){
         //product is existing in the wishlist
         resolve()
        // db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
        // {
        //   $pull:{wishListProduct:{_id:objectId(prodId)}}
        // }
        // ).then(()=>{
        //   let removeFromWishList ={}
        //   removeFromWishList.removed='true'
        //   resolve(removeFromWishList)
        // })
       }else{
         //product is not existing in the wishlist
         
        db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
        {
          $push:{wishListProduct:addedProduct}
        }
        ).then(()=>{
          let addedToWishlist ={}
          addedToWishlist.added ='true'
          resolve(addedToWishlist)
        })
       }
        
      }else{
        //order not existing in the cart
        
        let wishListObj = {
          user:objectId(userId),
          wishListProduct:[addedProduct]
        }
        db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishListObj).then(()=>{
          resolve()
        }).then(()=>{
          let addedProduct ={}
          addedProduct.added ='true'
          resolve(addedProduct)
        })
      }
     
    })
  },
  getWishListProducts:(userId)=>{
    return new Promise(async(resolve,reject)=>{
      let wishlistProducts = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
        {
          $match:{user:objectId(userId)}
        },
        {
          $unwind:"$wishListProduct"
        },
        {
          $project:{
            _id:"$wishListProduct._id",
            productname:"$wishListProduct.productname",
            brand:"$wishListProduct.brand",
            price:"$wishListProduct.price"
          }
        }
      ]).toArray()
      
      if(wishlistProducts[0]){
        for(key in wishlistProducts){
          let products = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(wishlistProducts[key]._id)})
          
          db.get().collection(collection.WISHLIST_COLLECTION).updateOne({wishListProduct:{$elemMatch:{_id:objectId(wishlistProducts[key]._id)}}},
          {
            $set:{
              "wishListProduct.$.price":products.price
            }
          }
          ).then(()=>{
            resolve(wishlistProducts)
          })
          
        }
      }else{
        resolve(false)
      }
       
      
      
      
    })
  },
  deleteWishlistProduct:(prodId,userId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
      {
        $pull:{wishListProduct:{_id:objectId(prodId)}}
      }).then((response)=>{
        resolve(response)
      })
    })
  },
  getUserAddressToEdit:(addressId)=>{
    return new Promise(async(resolve,reject)=>{
      await db.get().collection(collection.ADDRESS_COLLECTION).findOne({_id:objectId(addressId)}).then((address)=>{
        resolve(address)
      })
    })
  },
  updateUserAddress:(addressId,userAddress)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ADDRESS_COLLECTION).updateOne({_id:objectId(addressId)},
      {
        $set:{
          address:userAddress
        }
      }
      ).then(()=>{
        resolve()
      })
    })
  },
  convertAmount : (amount)=>{
    return new Promise(async(resolve,reject)=>{
        amount = parseInt(amount)
        axios.get(`http://apilayer.net/api/live?access_key=${ACCESS_KEY}&currencies=INR`).then(response => {
          
            amount = amount/response.data.quotes.USDINR
            resolve(amount)
        })
       
       
    })  
},


};
