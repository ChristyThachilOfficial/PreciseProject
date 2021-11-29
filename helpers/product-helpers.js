var db=require('../config/connection')
var collection=require('../config/collection')
const { response } = require('express')
var objectId=require('mongodb').ObjectId
module.exports={
    addProduct:(product)=>{
        product.quantity = parseInt(product.quantity)
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
                resolve(data.insertedId)
            })
        })
    },
    getTotalQuantity:(prodId)=>{
        return new Promise(async(resolve,reject)=>{
          await  db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
              resolve(product.quantity)
          })
        })
    },
    getallProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let ProductData=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
                resolve(ProductData)
            
        })
    },
    deleteProduct:(proId)=>{
        return new Promise(async(resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(proId)}).then((response)=>{
                
                db.get().collection(collection.CART_COLLECTION).update({},
                    {
                        $pull:{products:{item:objectId(proId)}}
                    }
                )
                db.get().collection(collection.WISHLIST_COLLECTION).update({},
                    {
                        $pull:{wishListProduct:{_id:objectId(proId)}}
                    })
               resolve(response)
           })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateproductDetails:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
           
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:objectId(proId)},{
                $set:{
                    productname:proDetails.productname,
                    quantity:parseInt(proDetails.quantity),
                    brand:proDetails.brand,
                    price:proDetails.price,
                    offerprice:proDetails.offerprice,
                    gender:proDetails.gender,
                    description:proDetails.description,
                    date:proDetails.date,
                    
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    getBuyNowProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((response)=>{
               resolve(response)
            })
        })
    },
    getProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((response)=>{
                
                resolve(response)   
            })
        })
    },
    buyNowProduct:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
         let product =await   db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
         resolve(product)
        })
    },
    addCategory:(categoryName)=>{
      
        return new Promise(async(resolve,reject)=>{
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({name:categoryName})
            if(category){
                let isCategoryExists = {}
                isCategoryExists.yesItExists ='true'
                resolve(isCategoryExists)
            }else{
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne({name:categoryName}).then((response)=>{
                    resolve(response)
                })
            }
           
        })
    },
    getAllCategory:()=>{
        return new Promise(async(resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).find().toArray().then((response)=>{
                resolve(response)
            })
        })
    },
    deleteCategory:(categoryId)=>{
        return new Promise(async(resolve,reject)=>{
           
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(categoryId)})
            await db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({_id:objectId(categoryId)}).then((response)=>{
             db.get().collection(collection.PRODUCT_COLLECTION).deleteMany({brand:category.name});
             db.get().collection(collection.CART_COLLECTION).update({},{$pull:{products:{brand:category.name}}})
                resolve(response)
            })
        })
    },
    findProductByBrand:(brandName)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).find({brand:brandName}).toArray().then((response)=>{
                resolve(response)
            })
        })
    },
    getMensProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).find({gender:"men"}).toArray().then((products)=>{
                resolve(products)
            })
        })
    },
    getWomensProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).find({gender:"women"}).toArray().then((products)=>{
                resolve(products)
            })
        })
    },
    getTotalRevenue:()=>{
        return new Promise(async(resolve,reject)=>{
            
            let revenueBuyNow =await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $group:{
                        _id:null,
                        totalRevenue:{$sum:"$totalAmount"}
                    }
                }
            ]).toArray()

            if (revenueBuyNow[0]) {
                var RevenueFromBuynow = revenueBuyNow[0].totalRevenue
            }else{
                RevenueFromBuynow =0
            }

            let revenueCart = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $project:{totalprice:"$products.totalprice"}
                },
                {
                    $group:{
                        _id:null,
                        revenueCart:{$sum:"$totalprice"}
                    }
                }
            ]).toArray()
            if(revenueCart[0]){
                var totalRevenueFromcart = revenueCart[0].revenueCart
            }else{
                totalRevenueFromcart =0
            }

            let totalRevenue =totalRevenueFromcart + RevenueFromBuynow
                
            resolve(totalRevenue)
        })
    },
    getProductsCount:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).find().count().then((productCount)=>{
                resolve(productCount)
            })
        })
    },
    getBrandsCount:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.CATEGORY_COLLECTION).find().count().then((brandCount)=>{
                resolve(brandCount)
            })
        })
    },
    getBrandName:(prodId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((response)=>{
               resolve(response.brand)
            })
        })
    },
    updateTotalQuantity:(prodId)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(prodId)},
        {
            $inc:{quantity:-1}
        }
        )
    },
    updateTotalQuantityCart:(product)=>{
       
        
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(product.item)},
            {
                $inc:{quantity:-product.Quantity}
            }
            ).then(()=>{
                resolve()
            })
        })
       
    },
    updateTotalQuantityInCart:(product)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(product.item)},
            {
                $inc:{quantity:product.Quantity}
            }).then(()=>{
                
                resolve()
            })
        })
    },
    getAllOrderCount:()=>{
        let differentOrderCounts ={};
        return new Promise(async(resolve,reject)=>{

            //total buy now orders
          let totalBuyNOwOrderCount = await db.get().collection(collection.ORDER_COLLECTION).find({mode:'buynow'}).count()
           //total cart orders
          var totalCartOrderCount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
              {
                  $match:{mode:'cart'}
              },
              {
                  $unwind:"$products"
              },
              {
                  $project:{Quantity:"$products.Quantity"}
              },
              {
                  $group:{
                      _id:null,
                      count:{$sum:'$Quantity'}
                    }
              }
              
          ]).toArray()
           
          if (totalCartOrderCount[0]) {
              var  CartOrderCount = totalCartOrderCount[0].count
          }else{
              CartOrderCount = 0;
          }

          
            
            //Cancelled orders buynow
            let cancelledOrderBuyNow = await db.get().collection(collection.ORDER_COLLECTION).find({status:"cancelled"}).count()
            let cancelledOrderCart = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $match:{'products.status':'cancelled'}
                },
                {
                    $project:{
                       Quantity:'$products.Quantity'
                    }
                },
                {
                    $group:{
                        _id:null,
                        count:{$sum:'$Quantity'}
                    }
                }
              
            ]).toArray()

            if(cancelledOrderCart[0]){
                var cancelledorderCart = cancelledOrderCart[0].count
            }else{
                cancelledorderCart = 0;
            }
            
            
            //delivered order products count
            let deliveredOrderBuyNow = await db.get().collection(collection.ORDER_COLLECTION).find({status:'delivered'}).count()

            let deliveredOrderCart =await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $match:{'products.status':'delivered'}
                },
                {
                    $project:{Quantity:"$products.Quantity"}
                },
                {
                    $group:{
                        _id:null,
                        count:{$sum:'$Quantity'}
                    }
                }
            ]).toArray()

            if(deliveredOrderCart[0]){
              var deliveredCart = deliveredOrderCart[0].count
            }else{
                deliveredCart = 0;
            }


             //shipped order products count
             let placedOrderBuyNow = await db.get().collection(collection.ORDER_COLLECTION).find({status:'placed'}).count()

             let placedOrderCart =await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                 {
                     $match:{mode:'cart'}
                 },
                 {
                     $unwind:"$products"
                 },
                 {
                     $match:{'products.status':'placed'}
                 },
                 {
                     $project:{Quantity:"$products.Quantity"}
                 },
                 {
                     $group:{
                         _id:null,
                         count:{$sum:'$Quantity'}
                     }
                 }
             ]).toArray()
 
             if(placedOrderCart[0]){
               var placedCart = placedOrderCart[0].count
             }else{
                placedCart = 0;
             }
            
           

            let totalOrders = totalBuyNOwOrderCount + CartOrderCount
            let totalCancelledOrder = cancelledorderCart + cancelledOrderBuyNow
            let totalDeliveredOrder = deliveredOrderBuyNow + deliveredCart
            let totalPlacedOrder = placedOrderBuyNow + placedCart
            differentOrderCounts.totalOrders = totalOrders
            differentOrderCounts.totalCancelledOrder =totalCancelledOrder
            differentOrderCounts.totalDeliveredOrder = totalDeliveredOrder
            differentOrderCounts.totalPlacedOrder = totalPlacedOrder
            
            resolve(differentOrderCounts)
        })
    },
    getOrderedProductsByStatus:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((orderlist)=>{
                resolve(orderlist)
            })
        })
    },
    totalOrdersByPaymentmethod:()=>{
        return new Promise(async(resolve,reject)=>{
            let totalRazorpayOrders = await db.get().collection(collection.ORDER_COLLECTION).find({paymentMethod:'Razorpay'}).count()
            let totalCODOrders = await db.get().collection(collection.ORDER_COLLECTION).find({paymentMethod:'COD'}).count()
            let totalPaypalOrders = await db.get().collection(collection.ORDER_COLLECTION).find({paymentMethod:'paypal'}).count()
            let ordersByPayment = [totalRazorpayOrders,totalCODOrders,totalPaypalOrders]
            resolve(ordersByPayment)
        })
    },
    getDeliveredOrders:()=>{
        return new Promise(async(resolve,reject)=>{
            let totalDeliveredOrderBuynow = await db.get().collection(collection.ORDER_COLLECTION).find({mode:'buynow',status:'delivered'}).toArray()
            let totalDeliveredOrderCart = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $match:{'products.status':'delivered'}
                },
                
            ]).toArray()
           let totalDeliveredOrder = totalDeliveredOrderBuynow.concat(totalDeliveredOrderCart)
            resolve(totalDeliveredOrder)
        })
    },
    getCancelledOrders:()=>{
        return new Promise(async(resolve,reject)=>{
            let totalCancelledOrderBuynow = await db.get().collection(collection.ORDER_COLLECTION).find({mode:'buynow',status:'cancelled'}).toArray()
            let totalCancelledOrderCart = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $match:{'products.status':'cancelled'}
                },
                
            ]).toArray()
            let totalCancelledOrder = totalCancelledOrderBuynow.concat(totalCancelledOrderCart)
            resolve(totalCancelledOrder)
        })
    },
    getReturnedOrders:()=>{
        return new Promise(async(resolve,reject)=>{
            let totalReturnedOrderBuynow = await db.get().collection(collection.ORDER_COLLECTION).find({mode:'buynow',status:'returned'}).toArray()
            let totalReturnedOrderCart = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $match:{'products.status':'returned'}
                },
                
            ]).toArray()
            let totalReturnedOrder = totalReturnedOrderBuynow.concat(totalReturnedOrderCart)
            resolve(totalReturnedOrder)
        })
    },
    addBrandOffer:(brandOfferData)=>{
        return new Promise(async(resolve,reject)=>{
            let brand = await db.get().collection(collection.PRODUCT_COLLECTION).find({brand:brandOfferData.brandName}).toArray()
           
           if (brand) {
               let IsBrandOfferExists = await db.get().collection(collection.BRANDOFFER_COLLECTION).findOne({brandName:brandOfferData.brandName})
               
               if (IsBrandOfferExists === null) {
                db.get().collection(collection.BRANDOFFER_COLLECTION).insertOne(brandOfferData).then(()=>{
                    resolve(brand)
                   })
                
               }else{
                   let brandOfferEXists = {}
                   brandOfferEXists.exists = 'true'
                   resolve(brandOfferEXists)
               }
           }else{
            let availabilityProduct = {}
            availabilityProduct.unavailable = 'true'
            resolve(availabilityProduct)
           }
           
        })
    },
    //update product offer price in product collection
    updateProductOfferDetails:(productData)=>{
        
        
        return new Promise(async(resolve,reject)=>{
            let brandOfferData = await db.get().collection(collection.BRANDOFFER_COLLECTION).findOne({brandName:productData.brand})
            
            
            let newOfferPrice = productData.price -  ((productData.price * brandOfferData.percentage) / 100)
            if(productData.offerPercentage){
                resolve(false)
            }else{
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(productData._id)},
                {
                    $set:{
                        productOfferPrice : parseInt(productData.price),
                        price: parseInt(newOfferPrice),
                        offerPercentage :parseInt(brandOfferData.percentage),
                        offerType : 'brandOffer'
                    }
                })
                resolve()
            }

            
           
        })
    },
    getAllBrandOffers:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.BRANDOFFER_COLLECTION).find().toArray().then((products)=>{
                resolve(products)
            })
        })
    },
    deleteBrandOffer:(brandOfferId,brand)=>{
        
        return new Promise(async(resolve,reject)=>{
            let offerProducts = await db.get().collection(collection.PRODUCT_COLLECTION).find({$and:[{brand:brand},{offerType:"brandOffer"}]}).toArray()
            db.get().collection(collection.BRANDOFFER_COLLECTION).deleteOne({_id:objectId(brandOfferId)}).then(()=>{
                db.get().collection(collection.ADVERTISEMENT_COLLECTION).deleteOne({brandName:brand})
                db.get().collection(collection.PRODUCT_COLLECTION).updateMany({$and:[{brand:brand},{offerType:"brandOffer"}]},
                    {
                        $unset:{offerPercentage:1,offerType:1}
                    })
                resolve(offerProducts)
            })
            
        })
    },
    updatePriceToRealPrice:(product)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(product._id)},
        {
            $set:{
                price:product.productOfferPrice,
                productOfferPrice:product.productOfferPrice
            }
        }).then(()=>{
            resolve()
        })
    },
    getAllOfferValidityExpiredBrands:()=>{
       
        return new Promise(async(resolve,reject)=>{
            let todayDate = new Date().toISOString().slice(0,10)
         let offerExpired =   await db.get().collection(collection.BRANDOFFER_COLLECTION).find({endDate : {$lte:  todayDate  }}).toArray()
        
         resolve(offerExpired)

        })
    },
    findSearchProducts:(searchText)=>{
        return new Promise(async(resolve,reject)=>{
         let searchResult =  await db.get().collection(collection.PRODUCT_COLLECTION).find({productname:{$regex:searchText,$options:"$i"}}).toArray()
         
         resolve(searchResult)
        })
    },

    //get validity expired coupons
    getValidityExpiredCoupons:()=>{
        return new Promise(async(resolve,reject)=>{
            let todaysDate = new Date().toISOString().slice(0,10)
         let offerExpiredCoupons = await   db.get().collection(collection.COUPON_COLLECTION).find({endDate:{$lte :todaysDate}}).toArray()
            resolve(offerExpiredCoupons)
        })
    },

    //get all product names
    getAllProductNames:()=>{
        return new Promise(async(resolve,reject)=>{
          let products =  await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
          resolve(products)
        })
    },

    //add product offer
    addProductOffer:(productOfferData)=>{
        return new Promise(async(resolve,reject)=>{
            
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({productname:productOfferData.productName})
            let newOfferPrice = product.price -  ((product.price * productOfferData.percentage) / 100)
            if(product.offerPercentage){  
            
               
               resolve()
            }else{
                db.get().collection(collection.PRODUCTOFFER_COLLECTION).insertOne(productOfferData).then(()=>{
                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({productname:productOfferData.productName},
                    {
                        $set:{
                            productOfferPrice : parseInt(product.price),
                            price: parseInt(newOfferPrice),
                            offerPercentage :parseInt(productOfferData.percentage)
                        }
                    }).then((response)=>{
                        resolve(response)
                    })
                })
            }
        })
    },
    getAllProductsOfferData:()=>{
        return new Promise(async(resolve,reject)=>{
            let productOfferCollection = await db.get().collection(collection.PRODUCTOFFER_COLLECTION).find().toArray()
            resolve(productOfferCollection)
        })
    },
    deleteProductOffer:(productOfferId,productName)=>{
        return new Promise(async(resolve,reject)=>{
            let product =await db.get().collection(collection.PRODUCT_COLLECTION).findOne({productname:productName})
            
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({productname:productName},{
                    $unset:{offerPercentage:1}
                }).then(()=>{
                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({productname:productName},
                        {
                            $set:{
                                price:product.productOfferPrice,
                                productOfferPrice:product.productOfferPrice
                            }
                        }).then(()=>{
                            db.get().collection(collection.PRODUCTOFFER_COLLECTION).deleteOne({_id:objectId(productOfferId)})
                            resolve()
                        })
                })
            
        })
    },

    //get all product offer expired products
    getAllofferValidityExpiredProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let todaysDate = new Date().toISOString().slice(0,10)
            db.get().collection(collection.PRODUCTOFFER_COLLECTION).find({endDate:{$lte:todaysDate}}).toArray().then((offerExpiredProducts)=>{
                resolve (offerExpiredProducts)
            })
        })
    },

    addAdvertisement:(advertisementDetails)=>{
        return new Promise(async(resolve,reject)=>{
            let brandOffer = await db.get().collection(collection.BRANDOFFER_COLLECTION).findOne({brandName :advertisementDetails.brandName})
            db.get().collection(collection.ADVERTISEMENT_COLLECTION).insertOne({brandName : advertisementDetails .brandName,details :advertisementDetails.adDetails ,percentage :brandOffer.percentage}).then((data)=>{
                
                resolve(data.insertedId)
            })

            
        })
    },

    getAllAdvertisement:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.ADVERTISEMENT_COLLECTION).find().toArray().then((response)=>{
                resolve(response)
            })

        })
    },

    deleteAdvertisement:(AdId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADVERTISEMENT_COLLECTION).deleteOne({_id:objectId(AdId)}).then((response)=>{
                resolve(response)
            })
        })
    }



}   