var db=require('../config/connection')
var collection=require('../config/collection')
const { response } = require('express')
var objectId=require('mongodb').ObjectId
module.exports={
    addProduct:(product)=>{
        
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
                resolve(data.insertedId)
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
                    quantity:proDetails.quantity,
                    brand:proDetails.brand,
                    price:proDetails.price,
                    offerprice:proDetails.offerprice,
                    gender:proDetails.gender,
                    description:proDetails.description,
                    date:proDetails.date,
                    image1:proDetails.image1,
                    image2:proDetails.image2,
                    image3:proDetails.image3
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
    }
}   