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
                    // image1:proDetails.image1,
                    // image2:proDetails.image2,
                    // image3:proDetails.image3
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
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne({name:categoryName}).then((response)=>{
                resolve(response)
            })
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

            let totalRevenue = revenueCart[0].revenueCart + revenueBuyNow[0].totalRevenue
                
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
        ).then((data)=>{
            resolve(data)
        })
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
            let cancelledOrderBuyNow = await db.get().collection(collection.ORDER_COLLECTION).find({status:"Cancelled"}).count()
            let cancelledOrderCart = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{mode:'cart'}
                },
                {
                    $unwind:"$products"
                },
                {
                    $match:{'products.status':'Cancelled'}
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
    }

}   