const { response } = require('express');
var express = require('express');
const { Db } = require('mongodb');
var router = express.Router();
var productHelpers= require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

let admindetails ={
  name:'admin',
  pass:123
}

router.get('/otp',(req,res,next)=>{
  res.render('admin/admin-otp',{typeOfPersonAdmin:true})
})

/* GET admin home. */
router.get('/', function(req, res, next) {
  res.render('admin/admin-home',{admin:true,typeOfPersonAdmin : true})
});

//get admin login
router.get('/login',(req,res,next)=>{
  res.render('admin/admin-login',{typeOfPersonAdmin:true})
})

// view products
router.get('/viewproducts',(req,res,next)=>{
  productHelpers.getallProducts().then((products)=>{
    res.render('admin/view-products',{typeOfPersonAdmin:true,admin:true,products})
  })
  
})

// view users
router.get('/viewusers',(req,res,next)=>{
 
  userHelpers.getAllUsers().then((users)=>{
      res.render('admin/view-users',{admin:true,typeOfPersonAdmin:true,users})
    })

})

//block users
router.get('/blockusers/:id',(req,res,next)=>{
  let userId = req.params.id
  console.log(userId)
  userHelpers.blockUser(userId).then((response)=>{
   res.redirect('/admin/viewusers')
   
  })
  
})

//unblock users
router.get('/unblockusers/:id',(req,res,next)=>{
  let userId = req.params.id
  userHelpers.unblockUser(userId).then((response)=>{
    res.redirect('/admin/viewusers')
  })
})



// ADD products
router.get('/addproduct',(req,res,next)=>{
  res.render('admin/add-product',{admin:true,typeOfPersonAdmin : true})
})

// POST add products
router.post('/addproduct',(req,res,next)=>{
  console.log(" image  1: ",req.files.image1);
  productHelpers.addProduct(req.body).then((id)=>{
     
    let image1=req.files.image1
    let image2=req.files.image2
    let image3=req.files.image3


    image1.mv('../ProjectClone22/public/productImages/'+id+'__1.jpg')
    image2.mv('../ProjectClone22/public/productImages/'+id+'__2.jpg') 
    image3.mv('../ProjectClone22/public/productImages/'+id+'__3.jpg')
    
    res.redirect('/admin/addproduct')

   
  })
  
})

//delete product
router.get('/deleteproducts/:id',(req,res,next)=>{
  let proId=req.params.id
  productHelpers.deleteProduct(proId).then((result)=>{
    res.redirect('/admin/viewproducts')
  })
})

//edit product
router.get('/editproducts/:id',async(req,res,next)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
    console.log(product)
    res.render('admin/edit-product',{product,typeOfPersonAdmin:true,admin:true})
  
 
 
})

//edit product post
router.post('/editproducts/:id',(req,res,next)=>{
  productHelpers.updateproductDetails(req.params.id,req.body).then(()=>{
    console.log('not working')
    res.redirect('/admin')
    if(req.files.image1 || req.files.image2 || req.files.image3){
    let image1=req.files.image1
    let image2=req.files.image2
    let image3=req.files.image3


    image1.mv('../ProjectClone/public/productImages/'+req.params.id+'__1.jpg')
    image2.mv('../ProjectClone/public/productImages/'+req.params.id+'__2.jpg')
    image3.mv('../ProjectClone/public/productImages/'+req.params.id+'__3.jpg')
    }
  })

}),

//order management
router.get('/order-management',(req,res,next)=>{
  userHelpers.getOrderList().then((orders)=>{
    res.render('admin/admin-orderManagement',{typeOfPersonAdmin:true,admin:true,orders})
  })
  
})

//order status update
router.get('/change-status/:orderId/:status',(req,res,next)=>{
  userHelpers.changeOrderStatus(req.params.orderId,req.params.status).then(()=>{
    res.json({status:true})
  })
})

router.post('/login',(req,res,next)=>{
  res.redirect('/admin')
})


// router.get('/view-orderedproduct/:orderId',async(req,res,next)=>{
//   console.log('the params in the user orderred product is',req.params.orderId)
//   let products=await userHelpers.getOrderProducts(req.params.orderId)
//   console.log('proddddddddddddduuuuuuuuuuuuuuccccccccccccttttttss areeeeeeee',products)
//   res.render('admin/admin-userorederproducts',{typeOfPersonAdmin:true,admin:true,products})
// })






module.exports = router;
