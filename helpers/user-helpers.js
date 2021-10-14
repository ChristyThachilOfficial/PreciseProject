var db=require('../config/connection')
var collection=require('../config/collection')
const bcrypt=require('bcrypt')
var objectId=require('mongodb').ObjectId
const { response } = require('express')
const Razorpay=require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_Fu2xGkKojPgkAm',
    key_secret: 'EjgkpT60XJNQQgBvrvqJVWDn',
  });

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{

            let userEmail= await db.get().collection(collection.USER_COLLECTIONS).findOne({email:userData.email})
            if(userEmail==null){
                userData.password= await bcrypt.hash(userData.password,10)
                userData.repassword=await bcrypt.hash(userData.repassword,10)
               
                
                db.get().collection(collection.USER_COLLECTIONS).insertOne(userData).then((response)=>{
                    resolve(response)
                })
            }else{
                resolve(false)
            }
           
        })
       
       
    },
    blockUser:(userId)=>{
        
        return new Promise (async(resolve,reject)=>{
           await db.get().collection(collection.USER_COLLECTIONS).updateOne({_id:objectId(userId)},{$set:{block:'true'}}).then(()=>{
               resolve()
           })
           
        })
    },
    
    unblockUser:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.USER_COLLECTIONS).updateOne({_id:objectId(userId)},{$set:{block:'false'}}).then(()=>{
                resolve()
            })
        })
    },
    
    getAllUsers:()=>{
        return new Promise((resolve,reject)=>{
           let users= db.get().collection(collection.USER_COLLECTIONS).find().toArray()
           resolve(users)
        })
    },
    removeFromCart:(product)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(product.cart)},
            {$pull:{products:{item:objectId(product.product)}}})
            .then((response)=>{
                resolve({removedProduct:true})
            })
        })
    },
   
    doLogin:(userData)=>{
        
        let loginStatus=false
        let response={}
        return new Promise(async(resolve,reject)=>{
            let user=await db.get().collection(collection.USER_COLLECTIONS).findOne({email:userData.email})
            console.log('at database');
            if(user){
                bcrypt.compare(userData.password,user.password).then((status)=>{
                    if (status){
                        response.user=user
                        response.status=true
                        resolve(response)

                    }else{
                        console.log('login failed with user');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login failed');
                resolve({status:false})
            }
           
        })
    },
    addToCart:(proId,userId,prodPrice)=>{
        let proObj={
            item:objectId(proId),
            Quantity:1,
            price:parseInt(prodPrice),
            totalprice:parseInt(prodPrice)
            
        }
        return new Promise(async(resolve,reject)=>{
            let userCart= await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist = userCart.products.findIndex(product =>product.item ==proId)
                console.log('proExist  at index',proExist)
                if (proExist !=-1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.Quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:objectId(userId)},
                    {
                        $push:{products:proObj}
                    }
                    ).then((response)=>{
                        resolve(response)
                    })
                }
              
            }else{
                let cartobj={
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response)=>{
                    resolve(response)
                })
            }
        })
    },
    getCartProduct:(userId)=>{
          return new Promise(async(resolve,reject)=>{
           let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
               {
                   $match: {user:objectId(userId)}
                },
                {
                    $unwind :'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        Quantity:'$products.Quantity',
                        price:'$products.price',
                        totalprice:'$products.totalprice'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,
                        Quantity:1,
                        price:1,
                        totalprice:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                }
               
           ]).toArray()
           
           
           if(cartItems[0]){
               console.log("sasi on fire",cartItems[0]);

            resolve(cartItems)
           }else{
               console.log("thamarakshan pilla");
               resolve({emptyCart:true})
           }
          })
    },
    findNumber:(userNum)=>{
        console.log("yyyyyyy");
        return new Promise(async(resolve,reject)=>{
            console.log(userNum);
           userNumber=await db.get().collection(collection.USER_COLLECTIONS).findOne({number:userNum.mob})
          if(userNumber){
              console.log("at if");
              resolve(userNumber)
          }else{
              console.log("at aelse");
              resolve(false)
          }
        })
    },
    changePassword:(userData,oldData)=>{
        return new Promise(async(resolve,reject)=>{
           userData.password= await bcrypt.hash(userData.password,10)
        
          var dataUpdated=await db.get().collection(collection.USER_COLLECTIONS).updateOne({_id:objectId(oldData._id)},{$set:{password:userData.password}})
          resolve(dataUpdated)
        })
    },
    getCartCount:(userId)=>{
       return new Promise(async(resolve,reject)=>{
        let count=0
        let userCart =await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        if(userCart){

            count=userCart.products.length
           
        }
        
        resolve(count)
       })
    },
    changeProductQuantity:(details)=>{
        
       details.Quantity=parseInt(details.Quantity)
      
        details.count=parseInt(details.count)
        details.price=parseInt(details.price)
        

        
       
       
        return new Promise((resolve,reject)=>{
            if(details.count == -1 && details.Quantity ==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
                {
                    $pull:{products:{item:objectId(details.product)}}
                }).then((response)=>{ 
                    resolve({removeProduct:true})
                })
            }else if(details.count == -1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                {
                    $inc:{'products.$.Quantity':details.count,'products.$.totalprice':details.price*-1}
                   
                   
                }
                ).then((response)=>{
                    
                    resolve(response)
                })
            }
            else{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                {
                    $inc:{'products.$.Quantity':details.count,'products.$.totalprice':details.price}
                   
                   
                }
                ).then((response)=>{
                    
                    resolve(response)
                })
            }
           
        })
    },
    /////////////////////////////////////////////////////////////////////////////////////////
    getProductPrice:()=>{
        return new Promise((resolve,reject)=>{
            return new Promise((resolve,reject)=>{
           
                let status=order.paymentMethod==='COD'?'placed':'pending'
                let orderObj={
                    deliveryDetails:{
                        firstname:order.firstname,
                       
                        lastname:order.lastname,
                        housename:order.housename,
                        streetaddress:order.streetaddress,
                        address:order.address,
                        town:order.town,
                        state:order.state,
                        zipcode:order.zipcode,
                        phone:order.phone,
                        regnum:order.regnum,
                        altnum:order.altnum,
                       
                        coupon:order.coupon,
                        
                        
                    },
                    userId:objectId(order.userId),
                    paymentMethod:order.paymentMethod,
                    products:products,
                    status:status,
                    date:new Date().toISOString().slice(0,10),
                    // when there is some errors check here
                    totalAmount:total
                }
    
                //im putting an inserted id over here
                db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                   console.log('orrrrrrrrrrrrrrrrrrrrrrddddder object',response.insertedId);
                    db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                    resolve(response.insertedId)
                })
    
            })
        })
    },
    /////////////////////////////////////////////////////////////////////////////////////
    getAllCartamount:(userData)=>{
       
        return new Promise(async(resolve,reject)=>{
            let totalCartPrice=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {user:objectId(userData)}
                 },
                 {
                     $unwind :'$products'
                 },
                 {
                     $project:{
                         item:'$products.item',
                         Quantity:'$products.Quantity',
                         price:'$products.price',
                         totalprice:'$products.totalprice'
                     }
                 },
                 {
                     $lookup:{
                         from:collection.PRODUCT_COLLECTION,
                         localField:'item',
                         foreignField:'_id',
                         as:'product'
                     }
                 },
                 {
                     $project:{
                         item:1,
                         Quantity:1,
                         price:1,
                         totalprice:1,
                         product:{$arrayElemAt:['$product',0]}
                     }
                 },
                 {
                     $group:{
                         _id:null,
                         totalcartprice:{$sum:'$totalprice'}
                     }
                 }
                
            ]).toArray()
            
            
            if(totalCartPrice[0]){
                console.log("sasi on fire",totalCartPrice[0].totalcartprice);
 
             resolve(totalCartPrice[0].totalcartprice)
            }else{
                console.log("thamarakshan pilla");
                resolve({emptyCart:true})
            }
           })
    },
    placeOrder:(order,products,total)=>{
        console.log('orderrrrrrrrrrrrrrrrrrrrrrrr',order)
        return new Promise((resolve,reject)=>{
           
            let status=order.paymentMethod==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    firstname:order.firstname,
                   
                    lastname:order.lastname,
                    housename:order.housename,
                    streetaddress:order.streetaddress,
                    address:order.address,
                    town:order.town,
                    state:order.state,
                    zipcode:order.zipcode,
                    phone:order.phone,
                    regnum:order.regnum,
                    altnum:order.altnum,
                   
                    coupon:order.coupon,
                    
                    
                },
                userId:objectId(order.userId),
                paymentMethod:order.paymentMethod,
                products:products,
                status:status,
                date:new Date().toISOString().slice(0,10),
                // when there is some errors check here
                totalAmount:total
            }

            //im putting an inserted id over here
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
               console.log('orrrrrrrrrrrrrrrrrrrrrrddddder object',response.insertedId);
                //heeeeeeeeeeeeeeeeeeeerrrrrrrrrreeeeeeeeeeeeee there was deleting the cart products moving it to get userOrders
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                resolve(response.insertedId)
            })

        })
        
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            
            console.log('carttttttttt',cart.products)
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId)
           
            let orders =await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
              
                resolve(orders)

            
        })
    },


    //this is tos
     getOrderProducts:(orderId)=>{
    
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {_id:objectId(orderId)}
                 },
                 {
                     $unwind :'$products'
                 },
                 {
                     $project:{
                         item:'$products.item',
                         Quantity:'$products.Quantity',
                         price:'$products.price',
                         totalprice:'$products.totalprice'
                     }
                 },
                 {
                     $lookup:{
                         from:collection.PRODUCT_COLLECTION,
                         localField:'item',
                         foreignField:'_id',
                         as:'product'
                     }
                 },
                 {
                     $project:{
                         item:1,
                         Quantity:1,
                         price:1,
                         totalprice:1,
                         product:{$arrayElemAt:['$product',0]}
                     }
                 }
                
            ]).toArray()
            
           
                console.log('orddddddddddddddder items are',orderItems)
             resolve(orderItems)
           
           })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err)
                  }else{
                    console.log('the orddddddddddddder in razorpay',order);
                    resolve(order)
                  }
               
              })
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto= require('crypto')
            let hmac = crypto.createHmac('sha256','EjgkpT60XJNQQgBvrvqJVWDn')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })

    },
    getUserDetails:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTIONS).findOne({_id:objectId(userId)}).then((response)=>{
                console.log('the response is',response)
                resolve(response)
            })
            
        })
    },
    updateUserProfile:(userData,userId)=>{
        return new Promise((resolve,reject)=>{
            console.log('idddddddddddddddddddddd od ',userData)
            db.get().collection(collection.USER_COLLECTIONS)
            .updateOne({_id:objectId(userId)},
            {
                $set:{
                    surname:userData.surname,
                    address1:userData.address1,
                    address2:userData.address2,
                    pincode:userData.pincode,
                    state:userData.state,
                    area:userData.area,
                    country:userData.country
                }
            }
            ).then((response)=>{
                
                resolve()
            })
        })
    },
    getOrderList:()=>{
        return new Promise(async(resolve,reject)=>{
            let orders =await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            console.log('orddddddderrrrrrrrrrrssssssssssss arrrrrrrrrrreeee',orders )
            resolve(orders)
        })

    },
   

   
}